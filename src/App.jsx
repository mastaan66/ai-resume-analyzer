import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Progress } from './components/ui/progress';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UploadCloud,
  FileText
} from 'lucide-react';
import { Toaster } from './components/ui/toaster';
import { useToast } from './components/ui/use-toast';
// This import is removed as Tailwind CSS is included in the index.html file via a CDN.
// import './globals.css';

// This is the main application component.
export default function App() {
  // State to hold the resume text input by the user.
  const [resumeText, setResumeText] = useState('');
  // State to hold the job description text input by the user.
  const [jobDescription, setJobDescription] = useState('');
  // State to hold the analysis results from the LLM.
  const [analysisResult, setAnalysisResult] = useState(null);
  // State to track if the analysis is currently in progress.
  const [isLoading, setIsLoading] = useState(false);
  // State to track errors during the API call.
  const [error, setError] = useState(null);
  // State to track the uploaded file object.
  const [file, setFile] = useState(null);
  // State to track if the file is being processed.
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const { toast } = useToast();

  // Load the pdf.js library dynamically
  useEffect(() => {
    // This function sets up the PDF.js worker. It's crucial for PDF processing.
    const setupPdfJsWorker = () => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          // Set the worker URL to the CDN version of the worker script.
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        }
      };
      document.head.appendChild(script);
    };

    setupPdfJsWorker();
  }, []); // Run only once on component mount

  // Helper function to handle exponential backoff for API calls.
  const fetchWithExponentialBackoff = async (url, options, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        console.warn(`Fetch failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithExponentialBackoff(url, options, retries - 1, delay * 2);
      } else {
        throw err;
      }
    }
  };

  /**
   * Reads text from a PDF file using the pdf.js library.
   * @param {File} pdfFile The PDF file to read.
   * @returns {Promise<string>} A promise that resolves with the extracted text.
   */
  const readPdfFile = async (pdfFile) => {
    if (!window.pdfjsLib) {
      throw new Error("PDF.js library is not loaded. Please try again.");
    }
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      textContent += text.items.map(item => item.str).join(' ');
    }
    return textContent;
  };

  // Handles file selection from the file input or drag-and-drop.
  const handleFileChange = async (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        setFile(null);
        setResumeText('');
        return;
      }
      setFile(selectedFile);
      setIsProcessingFile(true);
      setError(null);
      try {
        const text = await readPdfFile(selectedFile);
        setResumeText(text);
        toast({
          title: "File Loaded",
          description: `Successfully extracted text from ${selectedFile.name}.`,
        });
      } catch (err) {
        setError("Failed to process PDF. It may be corrupt or encrypted.");
        console.error("PDF processing error:", err);
        setFile(null);
        setResumeText('');
      } finally {
        setIsProcessingFile(false);
      }
    } else {
      setFile(null);
      setResumeText('');
    }
  };

  /**
   * The function that triggers the resume analysis.
   * It sends the resume text (either from paste or PDF) to the Gemini API.
   */
  const analyzeResume = async () => {
    // Clear previous results and errors.
    setAnalysisResult(null);
    setError(null);
    setIsLoading(true);

    // Prompt for the LLM to analyze the resume and return a JSON object.
    const prompt = `
      You are an expert career coach and resume analyst. Analyze the following resume text based on the provided job description.
      Provide a detailed and actionable feedback report in JSON format.
      The JSON object should have the following structure:
      {
        "atsScore": number, // A score from 0-100 indicating how well the resume would pass an ATS.
        "summary": string, // A brief, overall summary of the resume.
        "atsFeedback": string[], // A list of specific feedback points for improving ATS compatibility (e.g., keywords, formatting).
        "strengths": string[], // A list of the resume's key strengths.
        "weaknesses": string[], // A list of the resume's key weaknesses.
        "jobDescriptionMatch": string[] // A list of feedback points related to how well the resume matches the job description (e.g., keywords, skills, experience).
      }
      
      Resume text to analyze:
      ${resumeText}

      Job description to match against:
      ${jobDescription}
    `;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      
      // Define the schema for the JSON response we expect from the LLM.
      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            "type": "OBJECT",
            "properties": {
              "atsScore": { "type": "NUMBER" },
              "summary": { "type": "STRING" },
              "atsFeedback": { "type": "ARRAY", "items": { "type": "STRING" } },
              "strengths": { "type": "ARRAY", "items": { "type": "STRING" } },
              "weaknesses": { "type": "ARRAY", "items": { "type": "STRING" } },
              "jobDescriptionMatch": { "type": "ARRAY", "items": { "type": "STRING" } }
            },
            "propertyOrdering": ["atsScore", "summary", "atsFeedback", "strengths", "weaknesses", "jobDescriptionMatch"]
          }
        }
      };

      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetchWithExponentialBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(jsonString);
        setAnalysisResult(parsedJson);
        toast({
          title: "Analysis Complete!",
          description: "Your resume feedback is ready.",
        });
      } else {
        throw new Error("Invalid response format from the API.");
      }
    } catch (err) {
      console.error("Error during resume analysis:", err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      toast({
        title: "Error",
        description: err.message || 'An unexpected error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // UI component to display a list of feedback points with a specific icon.
  const FeedbackList = ({ title, items, icon }) => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-gray-700 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 flex items-start justify-center font-sans">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Main Application Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Resume Analyzer</CardTitle>
            <CardDescription className="text-lg mt-2">
              Paste your resume text or upload a PDF file below to get an instant analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Dropzone */}
            <div
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200 ${
                file ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-300 dark:border-gray-700 hover:border-blue-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileChange(e.dataTransfer.files[0]); }}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              {isProcessingFile ? (
                <div className="flex items-center gap-2 text-blue-500">
                  <Loader2 className="animate-spin" />
                  <p>Processing PDF...</p>
                </div>
              ) : file ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="h-6 w-6" />
                  <p className="font-medium">{file.name}</p>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">Drag and drop your PDF here, or click to browse</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">(.pdf files only)</p>
                  </div>
                </label>
              )}
            </div>

            {/* Resume Text Area */}
            <div className="space-y-2">
              <label htmlFor="resume-text" className="text-sm font-medium leading-none">
                Resume Text
              </label>
              <Textarea
                id="resume-text"
                className="h-72 text-base resize-none"
                placeholder={file ? `Text extracted from: ${file.name}` : "Paste your resume here..."}
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (file) setFile(null); // Clear file if user starts typing
                }}
                disabled={isProcessingFile}
              />
            </div>

            {/* Job Description Text Area */}
            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium leading-none">
                Job Description (Optional for basic analysis)
              </label>
              <Textarea
                id="job-description"
                className="h-48 text-base resize-none"
                placeholder="Paste the job description here for a more specific analysis..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isProcessingFile}
              />
            </div>

            {/* Analyze Button */}
            <Button
              onClick={analyzeResume}
              disabled={isLoading || isProcessingFile || !resumeText.trim()}
              className="w-full h-12 text-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" /> Analyzing...
                </>
              ) : (
                'Analyze Resume'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results Display */}
        {isLoading && (
          <Card className="p-8 text-center shadow-lg">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto" />
            <p className="mt-4 text-xl font-medium">Analyzing your resume...</p>
          </Card>
        )}

        {isProcessingFile && (
           <Card className="p-8 text-center shadow-lg">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto" />
            <p className="mt-4 text-xl font-medium">Extracting text from PDF...</p>
          </Card>
        )}

        {error && (
          <Card className="p-8 text-center shadow-lg border-red-500">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-xl font-medium text-red-600">Error: {error}</p>
            <p className="mt-2 text-gray-500">Please check your input and try again.</p>
          </Card>
        )}

        {analysisResult && (
          <Card className="shadow-lg p-6">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Analysis Report</CardTitle>
              <CardDescription className="text-lg">{analysisResult.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* ATS Score Section */}
              <div className="flex flex-col items-center justify-center mb-6">
                <span className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">
                  {analysisResult.atsScore}
                </span>
                <p className="text-xl font-medium text-gray-600 dark:text-gray-400">ATS Score</p>
                <Progress value={analysisResult.atsScore} className="w-full mt-2 h-3 bg-blue-100" />
              </div>
              
              {/* Feedback Lists */}
              <FeedbackList
                title="Strengths"
                items={analysisResult.strengths}
                icon={<CheckCircle className="text-green-500" />}
              />
              <FeedbackList
                title="Weaknesses"
                items={analysisResult.weaknesses}
                icon={<XCircle className="text-red-500" />}
              />
              {jobDescription.trim() && (
                <FeedbackList
                  title="Job Description Match"
                  items={analysisResult.jobDescriptionMatch}
                  icon={<AlertCircle className="text-blue-500" />}
                />
              )}
              <FeedbackList
                title="ATS-Specific Feedback"
                items={analysisResult.atsFeedback}
                icon={<AlertCircle className="text-yellow-500" />}
              />
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}

// shadcn/ui component exports
// NOTE: For this to work in a self-contained environment, we define the components here.
// In a real project, these would be in separate files.

const components = {
  Button: ({ children, className, ...props }) => (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-gray-900 text-gray-50 shadow hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
  Card: ({ children, className, ...props }) => (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }) => (
    <h3
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  ),
  CardDescription: ({ children, className, ...props }) => (
    <p
      className={`text-sm text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </p>
  ),
  CardContent: ({ children, className, ...props }) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  ),
  Textarea: ({ className, ...props }) => (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  ),
  Progress: ({ value, className, ...props }) => {
    const progressBarStyle = {
      transform: `translateX(-${100 - (value || 0)}%)`,
    };
    return (
      <div className={`relative h-2 w-full overflow-hidden rounded-full bg-primary/20 ${className}`}>
        <div
          className="h-full w-full flex-1 bg-blue-500 transition-all"
          style={progressBarStyle}
        />
      </div>
    );
  },
  Toaster: () => <div />,
  useToast: () => ({
    toast: ({ title, description, variant }) => {
      console.log('Toast:', { title, description, variant });
      // In a real application, this would render a toast notification.
      // For this self-contained example, we'll log it to the console.
    },
  }),
};
// To make the components available in this single file, we'll assign them
// to their corresponding export names.
const { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Textarea, Progress, Toaster, useToast } = components;

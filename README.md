# Resume Analyzer App
An AI-powered web application built with React to help job seekers get instant and actionable feedback on their resumes. This tool analyzes your resume for an ATS (Applicant Tracking System) score, identifies strengths and weaknesses, and provides a targeted analysis based on a specific job description.

# Features
- ATS Score: Get a score from 0-100 indicating how well your resume would pass an Applicant Tracking System.
- Strengths & Weaknesses: Receive a detailed breakdown of what's working and what could be improved in your resume.
- Job Description Match: Paste a job description to get a tailored analysis on how your resume aligns with the role's requirements, highlighting key keywords and missed opportunities.
- PDF Upload: Easily upload your resume in PDF format, and the app will automatically extract the text for analysis.

Screenshots
Here are some screenshots of the application in action.

### Main View

#### Analysis Results

### Technologies Used
- Frontend: React

- Styling: Tailwind CSS

- PDF Parsing: pdf.js library

- Backend: Gemini API (used for the analysis logic)

### Installation and Setup
Follow these steps to get the project running on your local machine.

#### Prerequisites
- Node.js & npm: Ensure you have Node.js (v14.0 or newer) and npm installed on your system. You can download it from the official Node.js website.

#### Step 1: Clone the Repository
Clone this repository to your local machine.

git clone https://github.com/mastaan66/ai-resume-analyzer.git
cd ai-resume-analyzer

#### Step 2: Install Dependencies
Install all the required packages by running the following command in the project directory.

```js
npm install
```

#### Step 3: Run the App
Start the development server.

```js
npm run dev
```

#### Your app will be live at http://localhost:5173.

### Usage
- Paste your Resume: Paste the text of your resume into the first text area, or use the drag-and-drop zone to upload a PDF file.

- Add a Job Description: Paste the job description for a specific role into the second text area for a more targeted analysis. This step is optional.

- Click "Analyze": Click the button to get your detailed feedback report, including the ATS score and a list of strengths and weaknesses.
# AICTE Activity Points Report Generator

A tool for generating AICTE Activity Points forms for RVCE students. Fill in your activities, attach photos and certificates, and download the finished report as a PDF.

It runs entirely on your own machine. For the hosted version, visit [AICTE Activity Points](https://aicte-activity-points.vercel.app).

## Getting Started

You need [Node.js](https://nodejs.org) 18.18 or newer.

1. **Clone the repository**

   ```bash
   git clone https://github.com/CubeStar1/aicte-activity-points.git
   cd aicte-activity-points
   ```

2. **Turn on local mode**

   Create a file named `.env.local` in the project folder with this line:

   ```bash
   NEXT_PUBLIC_LOCAL_MODE=true
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000/form-filler](http://localhost:3000/form-filler) in your browser.

## Where your data is kept

Everything stays in the `.local-data` folder inside the project:

| Path | Contents |
| --- | --- |
| `.local-data/form.json` | Your form: student details, activities and signatories |
| `.local-data/uploads/` | The photos and certificates you attached |

Photos and certificates must be JPG or PNG, up to 2 MB each.

## Filling the form with a coding agent

A coding agent (Claude Code, Cursor, Codex and others) can fill in the form for you over MCP, working from a folder of your notes, photos and certificates.

With the app running, open [http://localhost:3000/connect](http://localhost:3000/connect). It gives you the command to add the server to your agent and a prompt to paste in.
```bash
claude mcp add --transport http aicte-activity-points http://localhost:3000/api/mcp
```

Keep the app running while the agent works, then reload the form page to see its changes. Check what it wrote before you download the PDF.

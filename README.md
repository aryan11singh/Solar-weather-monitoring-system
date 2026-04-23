☀️ Solar Weather Monitoring System
A real-time solar weather monitoring dashboard that tracks space weather conditions, solar events, and their potential impact on Earth. Built with React and powered by NASA's DONKI API.

React Vite TailwindCSS License

🌟 Features
Real-Time Solar Data — Live monitoring of solar flares, coronal mass ejections (CMEs), geomagnetic storms, and solar energetic particles
Interactive Dashboard — Clean, responsive interface with data visualizations
Event Timeline — Historical view of recent solar events with detailed metadata
Impact Assessment — Estimated Earth-impact predictions for tracked solar phenomena
Dark/Light Mode — Comfortable viewing in any lighting condition
🛠️ Tech Stack
Category	Technology
Frontend	React 18, JavaScript
Build Tool	Vite
Styling	Tailwind CSS
API	NASA DONKI (Space Weather Database)
Linting	ESLint
🚀 Getting Started
Prerequisites
Node.js 18+
npm or yarn
NASA API key (free at 
api.nasa.gov
)
Installation
Clone the repository
bash


git clone [github.com](https://github.com/aryan11singh/Solar-weather-monitoring-system.git)
cd Solar-weather-monitoring-system
Install dependencies
bash


npm install
Configure environment variables Create a .env file in the root directory:
env


VITE_NASA_API_KEY=your_nasa_api_key_here
Start the development server
bash


npm run dev
Open your browser Navigate to [localhost](http://localhost:5173)
📁 Project Structure


Solar-weather-monitoring-system/
├── public/
├── src/
│   ├── assets/          # Static assets (images, icons)
│   ├── components/      # Reusable React components
│   ├── App.jsx          # Main application component
│   ├── App.css          # Global styles
│   ├── index.css        # Tailwind directives
│   └── main.jsx         # Application entry point
├── .env                 # Environment variables (create locally)
├── eslint.config.js     # ESLint configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── vite.config.js       # Vite configuration
└── package.json
📡 API Reference
This project uses NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information) API to fetch real-time solar weather data.

Endpoint	Description
/CME	Coronal Mass Ejections
/FLR	Solar Flares
/GST	Geomagnetic Storms
/SEP	Solar Energetic Particles
For full API documentation, visit 
api.nasa.gov
.

🧑‍💻 Available Scripts


Command	Description
npm run dev	Start development server
npm run build	Build for production
npm run preview	Preview production build
npm run lint	Run ESLint

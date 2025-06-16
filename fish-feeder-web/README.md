# Fish Feeder Web Application

React TypeScript web application for monitoring and controlling the fish feeder IoT system.

## Features

- Real-time sensor data monitoring
- Motor and actuator control interface
- Firebase Realtime Database integration
- Responsive design with Tailwind CSS
- Dark/light mode support
- Data visualization and analytics

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase SDK
- React Router

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── contexts/           # React contexts
└── config/             # Configuration files
```

## Key Components

### Data Management
- `JsonDataOrganizer` - Clean JSON data organization
- `firebaseSensorUtils` - Firebase data utilities
- `useFirebaseSensorData` - Real-time data hook

### Pages
- `DataManagement` - Organized sensor data view
- `FeedControlPanel` - Motor control interface
- `Analytics` - Data visualization
- `Settings` - Configuration panel

## Development

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Firebase Deployment
```bash
npm run deploy
```

## Environment Variables

Create `.env` file with:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_DATABASE_URL=your-database-url
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Firebase Configuration

- Realtime Database for sensor data
- Firebase Hosting for deployment
- Authentication (if enabled)

## Data Organization

The application uses organized JSON data structures:

### Sensor Data Groups
- Temperature sensors (feeder, system, ambient)
- Humidity sensors (feeder, system, ambient)
- Electrical system (battery, solar, load)
- Mechanical system (weight, soil moisture)

### Control Data Groups
- Auger control (direction, speed, enabled)
- Blower control (state, speed)
- Actuator control (position, enabled)
- Relay control (relay1-4)

## Architecture Rules

### FORBIDDEN
- Blocking operations
- Direct Arduino communication
- Hardcoded data
- Mock files

### REQUIRED
- Event-driven programming
- Firebase as message broker
- JSON data format only
- TypeScript strict mode

## URL Parameters

- `?minimal=true` - Minimal UI mode
- `?nomodals=true` - Disable all modals
- `?nosplash=true` - Skip splash screen

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript best practices
2. Use proper error handling
3. Implement responsive design
4. Write clean, readable code
5. No emoji characters in code

## License

Private project - All rights reserved. 
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import './styles/components.css';
import './styles/canvas.css';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(<App />);

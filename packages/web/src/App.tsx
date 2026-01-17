import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './theme/ThemeProvider';
import { HomePage } from './pages/HomePage';
import { GroupPage } from './pages/GroupPage';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/g/:groupId" element={<GroupPage />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

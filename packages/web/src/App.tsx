import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GroupPage } from './pages/GroupPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/g/:groupId" element={<GroupPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

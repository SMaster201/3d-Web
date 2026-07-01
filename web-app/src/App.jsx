import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import AiChat from './pages/AiChat';
import DetectionHistory from './pages/DetectionHistory';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<AiChat />} />
          <Route path="/history" element={<DetectionHistory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

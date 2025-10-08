import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Anomalies } from '@/pages/Anomalies';
import { IpsList } from '@/pages/IpsList';
import { IpDetails } from '@/pages/IpDetails';
import { Blocklist } from '@/pages/Blocklist';
import { Assistant } from '@/pages/Assistant';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/ips" element={<IpsList />} />
            <Route path="/ips/:ip" element={<IpDetails />} />
            <Route path="/blocklist" element={<Blocklist />} />
            <Route path="/assistant" element={<Assistant />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;


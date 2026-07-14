import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Boxes, Building2, Store } from 'lucide-react';
import CustomerConsole from './pages/CustomerConsole';
import ConnectorDetail from './pages/ConnectorDetail';
import OpsConsole from './pages/OpsConsole';
import Marketplace from './pages/Marketplace';
import { DataProvider, useData } from './context/DataContext';

function TopNav() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border ${
      isActive ? 'bg-cyan-500/10 text-[#0969da] border-cyan-500/40' : 'text-[#57606a] border-transparent hover:border-[#d8dee4]'
    }`;

  return (
    <header className="border-b border-[#d0d7de] bg-[#ffffff]/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-[1680px] mx-auto px-6 py-3 flex items-center gap-4">
        <p className="text-sm font-semibold text-[#1f2328] tracking-tight">🔌 Connector Command Center</p>
        <nav className="flex items-center gap-2 ml-auto">
          <NavLink to="/" end className={linkClass}>
            <Boxes size={13} /> Customer Console
          </NavLink>
          <NavLink to="/ops" className={linkClass}>
            <Building2 size={13} /> Acme Corp Ops Console
          </NavLink>
          <NavLink to="/marketplace" className={linkClass}>
            <Store size={13} /> Marketplace
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { loading, error } = useData();

  if (loading) {
    return <div className="max-w-[1680px] mx-auto px-6 py-10 text-sm text-[#6e7781]">Loading connector data…</div>;
  }
  if (error) {
    return <div className="max-w-[1680px] mx-auto px-6 py-10 text-sm text-[#cf222e]">Failed to load data: {String(error.message || error)}</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<CustomerConsole />} />
      <Route path="/connector/:id" element={<ConnectorDetail />} />
      <Route path="/ops" element={<OpsConsole />} />
      <Route path="/marketplace" element={<Marketplace />} />
    </Routes>
  );
}

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <TopNav />
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;

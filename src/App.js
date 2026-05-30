import './App.css';
import MainContainer from './containers/MainContainer';
import Layout from './layouts/MainLayout.jsx';
import { TripProvider } from './context/TripContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './screens/Auth/Auth';

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <span className="app-loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <TripProvider>
      <Layout>
        <MainContainer />
      </Layout>
    </TripProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;

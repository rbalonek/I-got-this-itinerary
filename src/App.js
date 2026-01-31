import './App.css';
import MainContainer from './containers/MainContainer';
import Layout from './layouts/MainLayout.jsx';
import { TripProvider } from './context/TripContext';

function App() {
  return (
    <TripProvider>
      <Layout>
        <MainContainer />
      </Layout>
    </TripProvider>
  );
}

export default App;

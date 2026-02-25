import ECRIDashboard from './ECRIDashboard'
import { ECRITenantCardDemo } from './ECRITenantCard'

export default function App() {
  // Add ?card to URL to see the tenant card demo
  const showCardDemo = window.location.search.includes('card');
  if (showCardDemo) return <ECRITenantCardDemo />;
  return <ECRIDashboard />;
}

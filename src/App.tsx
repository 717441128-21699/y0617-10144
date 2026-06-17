import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import DataAssets from '@/pages/DataAssets'
import Consent from '@/pages/Consent'
import SubjectRequests from '@/pages/SubjectRequests'
import Breaches from '@/pages/Breaches'
import Audit from '@/pages/Audit'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-assets" element={<DataAssets />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/requests" element={<SubjectRequests />} />
          <Route path="/breaches" element={<Breaches />} />
          <Route path="/audit" element={<Audit />} />
        </Route>
      </Routes>
    </Router>
  )
}

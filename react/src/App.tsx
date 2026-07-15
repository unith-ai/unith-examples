import './App.css'
import { SessionProvider } from '@unith-ai/react-components'
import { UnithChat } from './Example'

function App() {
  return (
    <SessionProvider>
      <UnithChat />
    </SessionProvider>
  )
}

export default App

// Dev harness: the System > Protocols page, no sign-in. The Rules pill reads the Ledger and stays empty here.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import LumenProtocolsPage from '../src/components/LumenProtocolsPage'

createRoot(document.getElementById('root')).render(<StrictMode><LumenProtocolsPage /></StrictMode>)

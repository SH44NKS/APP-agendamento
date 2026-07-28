import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"APP agendamento | Foco & Escudo",description:"Sistema interno para controle operacional de instalações, retiradas e manutenções."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}

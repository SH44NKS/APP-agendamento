import type {Metadata} from "next";import "./globals.css";import "./brand.css";
export const metadata:Metadata={title:"APP agendamento | Foco & Escudo",description:"Sistema interno para controle operacional de instalações, retiradas e manutenções.",icons:{icon:"/app-icon.png",apple:"/app-icon.png"},manifest:"/manifest.webmanifest",verification:{google:"_Z2Ed8XfOtqqPK_iiOz1aXk4Dvr-dH8jOu3Hpuxuz04"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}

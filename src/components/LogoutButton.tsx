"use client";
import {createClient} from "@/lib/supabase/client";
export function LogoutButton({icon}:{icon?:React.ReactNode}){return <button className="nav-link w-full text-left" onClick={async()=>{await createClient().auth.signOut();location.href="/login"}}>{icon}<span>Sair</span></button>}

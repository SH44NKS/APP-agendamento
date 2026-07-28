"use client"; import {createClient} from "@/lib/supabase/client";
export function LogoutButton(){return <button className="nav-link text-left" onClick={async()=>{await createClient().auth.signOut();location.href="/login"}}>Sair</button>}

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("push",event=>{
  const data=event.data?event.data.json():{};
  event.waitUntil(self.registration.showNotification(data.title||"APP agendamento",{body:data.body||"Você recebeu um novo aviso.",icon:data.icon||"/app-icon.png",badge:"/app-icon.png",data:{url:data.url||"/tecnico"}}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"/tecnico";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(windows=>{const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);if(existing){existing.focus();existing.navigate(url);return;}return clients.openWindow(url);}));
});

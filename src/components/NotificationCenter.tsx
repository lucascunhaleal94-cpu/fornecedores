import React, { useState } from 'react';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Info, AlertOctagon, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationCenter() {
  const { notifications } = useNotifications();
  const topNotifications = notifications.slice(0, 5);
  const remainingCount = notifications.length - topNotifications.length;
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const groupedNotifications = {
    'Projetos': notifications.filter(n => n.category === 'Projetos'),
    'Pendências': notifications.filter(n => n.category === 'Pendências'),
    'Manutenções': notifications.filter(n => n.category === 'Manutenções'),
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger': return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgClass = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger': return 'bg-red-50 hover:bg-red-100/50';
      case 'warning': return 'bg-amber-50 hover:bg-amber-100/50';
      case 'info': return 'bg-blue-50 hover:bg-blue-100/50';
    }
  };

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-slate-400 hover:text-white p-2.5 rounded-full hover:bg-white/10 transition-all relative">
          <Bell size={20} />
          {notifications.length > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 shadow-xl border-slate-200 overflow-hidden rounded-xl">
        <DropdownMenuLabel className="flex justify-between items-center py-3 px-4 bg-slate-50 border-b border-slate-100">
          <span className="font-semibold text-slate-800">Alertas Recentes</span>
          <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
            {notifications.length}
          </span>
        </DropdownMenuLabel>
        
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 mb-3 text-green-400" />
              <span className="font-medium text-slate-700">Tudo limpo!</span>
              <span className="mt-1">Nenhum projeto ou pendência em atraso.</span>
            </div>
          ) : (
            <div className="py-2 flex flex-col gap-1 px-2">
              {topNotifications.map((notif) => (
                <div key={notif.id}>
                  {notif.link ? (
                    <Link to={notif.link}>
                      <DropdownMenuItem className={`p-3 rounded-lg cursor-pointer flex items-start gap-3 transition-colors outline-none focus:bg-slate-100 ${getBgClass(notif.type)}`}>
                        <div className="mt-0.5 shadow-sm p-1.5 bg-white rounded-md shrink-0 border border-slate-100">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <p className="text-sm font-medium text-slate-900 leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {notif.description}
                          </p>
                          <p className="text-[10px] text-slate-400 pt-1 font-medium flex items-center justify-between">
                            {format(notif.date, "dd MMM yyyy", { locale: ptBR })}
                            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  ) : (
                    <div className={`p-3 rounded-lg flex items-start gap-3 border border-transparent ${getBgClass(notif.type)}`}>
                      <div className="mt-0.5 shadow-sm p-1.5 bg-white rounded-md shrink-0 border border-slate-100">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {notif.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {remainingCount > 0 && (
          <div 
            className="p-2 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
             <p className="text-xs text-center text-slate-500 font-medium pt-1 hover:text-slate-700 transition-colors">
               E mais {remainingCount} alerta{remainingCount > 1 ? 's' : ''} aguardando. Clique para ver todos.
             </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <DialogTitle className="text-xl text-slate-800">Central de Notificações</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-8">
              {(Object.keys(groupedNotifications) as (keyof typeof groupedNotifications)[]).map((category) => {
                const categoryNotifs = groupedNotifications[category];
                if (categoryNotifs.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                      {category}
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                        {categoryNotifs.length}
                      </span>
                    </h3>
                    <div className="grid gap-2">
                      {categoryNotifs.map(notif => (
                        <div key={notif.id}>
                          {notif.link ? (
                            <Link to={notif.link} onClick={() => setIsModalOpen(false)} className="block">
                              <div className={`p-4 rounded-lg cursor-pointer flex items-start gap-4 transition-colors border border-transparent ${getBgClass(notif.type)}`}>
                                <div className="mt-0.5 shadow-sm p-2 bg-white rounded-md shrink-0 border border-slate-100">
                                  {getIcon(notif.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-semibold text-slate-900 leading-tight flex items-center gap-2">
                                    {notif.title}
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                  </p>
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    {notif.description}
                                  </p>
                                  <p className="text-xs text-slate-500 pt-1 font-medium">
                                    {format(notif.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className={`p-4 rounded-lg flex items-start gap-4 border border-transparent ${getBgClass(notif.type)}`}>
                              <div className="mt-0.5 shadow-sm p-2 bg-white rounded-md shrink-0 border border-slate-100">
                                {getIcon(notif.type)}
                              </div>
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">
                                  {notif.title}
                                </p>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {notif.description}
                                </p>
                                <p className="text-xs text-slate-500 pt-1 font-medium">
                                  {format(notif.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

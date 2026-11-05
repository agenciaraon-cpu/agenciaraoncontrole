import React, { useState, useMemo } from 'react';
import {
  Gift,
  Calendar,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  PartyPopper,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Client, ContactLog } from '../types';
import { updateClient } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { WhatsAppModal } from '../components/common/WhatsAppModal';

interface BirthdaysViewProps {
  clients: Client[];
  contactLogs: ContactLog[];
  onRefresh: () => void;
}

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  clients,
  contactLogs,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = now.getDate();

  // WhatsApp state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [targetClient, setTargetClient] = useState<Client | null>(null);

  // Parse birthdays & calculate days remaining in the year
  const birthdaysData = useMemo(() => {
    return clients
      .filter((c) => !!c.responsibleBirthDate)
      .map((c) => {
        const [y, mStr, dStr] = (c.responsibleBirthDate || '').split('-');
        const month = parseInt(mStr, 10);
        const day = parseInt(dStr, 10);

        // Date in current year
        const thisYearBirthday = new Date(currentYear, month - 1, day);
        const diffMs = thisYearBirthday.getTime() - new Date(currentYear, now.getMonth(), now.getDate()).getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const isToday = diffDays === 0;
        const isNext5Days = diffDays > 0 && diffDays <= 5;
        const isCurrentMonth = mStr === currentMonthNum;
        const isCongratulatedThisYear = c.congratulatedYear === currentYear;

        return {
          client: c,
          day,
          month,
          diffDays,
          isToday,
          isNext5Days,
          isCurrentMonth,
          isCongratulatedThisYear,
          displayDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [clients, currentYear, currentMonthNum, now]);

  // Today birthdays
  const todayBirthdays = birthdaysData.filter((b) => b.isToday);
  // Next 5 days
  const next5DaysBirthdays = birthdaysData.filter((b) => b.isNext5Days);
  // Month birthdays
  const monthBirthdays = birthdaysData.filter((b) => b.isCurrentMonth);

  const handleCongratulate = async (client: Client) => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    try {
      await updateClient(
        client.id,
        {
          congratulatedYear: currentYear,
          updatedAt: new Date().toISOString(),
        },
        user?.email || 'somosraon@gmail.com'
      );
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenWhatsAppBirthday = (client: Client) => {
    setTargetClient(client);
    setWhatsAppModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          <Gift className="w-6 h-6 text-[#FF7817]" />
          Central de Aniversariantes & Felicitações
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Relacionamento humanizado: alertas de 5 dias de antecedência, lembrete no dia e envio direto de mensagens personalizadas no WhatsApp.
        </p>
      </div>

      {/* Today Alert Banner if any */}
      {todayBirthdays.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FF7817] to-amber-500 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl text-2xl backdrop-blur-xs">
              🎂
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                Aniversário Hoje!
              </span>
              <h3 className="text-lg font-black mt-1">
                {todayBirthdays.map((b) => b.client.responsibleName).join(', ')}
              </h3>
              <p className="text-xs text-white/90">
                Dia de celebrar! Envie agora mesmo as felicitações oficiais da Agência Raon.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {todayBirthdays.map((b) => (
              <button
                key={b.client.id}
                onClick={() => handleOpenWhatsAppBirthday(b.client)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#FF7817] font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>Felicitar no WhatsApp</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Proactive 5-Day Alert Section */}
      {next5DaysBirthdays.length > 0 && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#0878D9]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0878D9]">
              Alerta de Proximidade (Próximos 5 Dias)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {next5DaysBirthdays.map((b) => (
              <div
                key={b.client.id}
                className="p-3 bg-white dark:bg-[#10192A] rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {b.client.responsibleName}
                  </h4>
                  <p className="text-[11px] text-slate-500">{b.client.companyName}</p>
                  <span className="text-[10px] font-black text-[#0878D9] mt-0.5 inline-block">
                    {b.displayDate} (em {b.diffDays} dias)
                  </span>
                </div>
                <button
                  onClick={() => handleOpenWhatsAppBirthday(b.client)}
                  className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                  title="Antecipar mensagem"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Birthdays of the Month Table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FF7817]" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              Aniversariantes do Mês ({monthBirthdays.length})
            </h3>
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Responsável</th>
              <th className="py-3 px-4">Empresa</th>
              <th className="py-3 px-4">WhatsApp</th>
              <th className="py-3 px-4">Status de Felicitação</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthBirthdays.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Nenhum aniversariante cadastrado para o mês atual.
                </td>
              </tr>
            ) : (
              monthBirthdays.map((b) => (
                <tr key={b.client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#FF7817]">
                    {b.displayDate}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {b.client.responsibleName}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                    {b.client.companyName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {b.client.whatsapp}
                  </td>
                  <td className="py-3.5 px-4">
                    {b.isCongratulatedThisYear ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Felicitado em {currentYear}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!b.isCongratulatedThisYear && (
                        <button
                          onClick={() => handleCongratulate(b.client)}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-lg text-xs font-bold transition-colors"
                          title="Marcar como felicitado"
                        >
                          Marcar Felicitado
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenWhatsAppBirthday(b.client)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* WhatsApp Modal */}
      {targetClient && (
        <WhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setTargetClient(null);
          }}
          clientId={targetClient.id}
          clientName={targetClient.companyName}
          responsibleName={targetClient.responsibleName}
          phone={targetClient.whatsapp}
          userEmail={user?.email || 'somosraon@gmail.com'}
          defaultTemplate="aniversario"
          variables={{}}
        />
      )}
    </div>
  );
};

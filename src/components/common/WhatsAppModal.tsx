import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { createContactLog } from '../../services/db';

export type WhatsAppTemplateKey =
  | 'lembrete_vencimento'
  | 'cobranca_hoje'
  | 'cobranca_atraso'
  | 'aniversario'
  | 'boas_vindas'
  | 'renovacao'
  | 'comunicado_geral';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  responsibleName: string;
  phone: string;
  userEmail: string;
  defaultTemplate?: WhatsAppTemplateKey;
  variables?: {
    valor?: string;
    vencimento?: string;
    diasAtraso?: number;
    plano?: string;
    chavePix?: string;
  };
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, { name: string; text: string }> = {
  lembrete_vencimento: {
    name: 'Lembrete de Vencimento (Próximo)',
    text: 'Olá, {nome}! Tudo bem? Passando para lembrar que sua mensalidade da Agência Raon, referente ao {plano}, no valor de {valor}, tem vencimento em {vencimento}.\n\nCaso já tenha agendado ou efetuado o pagamento, por gentileza desconsidere. Qualquer dúvida, estamos à disposição! 🚀',
  },
  cobranca_hoje: {
    name: 'Cobrança no Dia do Vencimento',
    text: 'Olá, {nome}! Esperamos que esteja tendo um ótimo dia. 🚀\n\nLembramos que a sua mensalidade da Agência Raon vence hoje ({vencimento}), no valor de {valor}.\n\nSe precisar da chave PIX ou boleto para quitação, nos avise por aqui. Conte sempre conosco!',
  },
  cobranca_atraso: {
    name: 'Cobrança em Atraso',
    text: 'Olá, {nome}! Tudo bem?\n\nNotamos que a mensalidade da Agência Raon com vencimento em {vencimento} (valor de {valor}) ainda consta pendente em nosso sistema financeiro.\n\nPodemos ajudar com uma segunda via ou confirmação do comprovante? Estamos prontos para te apoiar! 🤝',
  },
  aniversario: {
    name: 'Felicitações de Aniversário 🎂',
    text: 'Parabéns, {nome}! 🎂🎉\n\nToda a equipe da Agência Raon deseja a você um novo ciclo repleto de saúde, realizações e muito sucesso!\n\nÉ um imenso orgulho e privilégio caminhar ao seu lado. Aproveite muito o seu dia! 🚀✨',
  },
  boas_vindas: {
    name: 'Boas-Vindas ao Cliente 🌟',
    text: 'Seja muito bem-vindo(a) à Agência Raon, {nome}! 🚀\n\nEstamos extremamente animados com o início da nossa parceria e prontos para levar o posicionamento da sua empresa ao próximo nível.\n\nNosso canal oficial está 100% aberto para qualquer necessidade da sua operação!',
  },
  renovacao: {
    name: 'Renovação de Contrato',
    text: 'Olá, {nome}! Como estão os resultados?\n\nO ciclo atual do seu contrato na Agência Raon está completando o período vigente. Gostaríamos de alinhar os novos objetivos estratégicos e garantir a continuidade do seu crescimento digital!\n\nPodemos marcar um breve bate-papo esta semana?',
  },
  comunicado_geral: {
    name: 'Comunicado Geral da Agência',
    text: 'Olá, {nome}! Tudo bem?\n\nPassando com um aviso rápido da Agência Raon sobre nosso cronograma de produção e atendimento.\n\nConte sempre conosco para acelerar sua marca! 🚀',
  },
};

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  responsibleName,
  phone,
  userEmail,
  defaultTemplate = 'lembrete_vencimento',
  variables = {},
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>(defaultTemplate);
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savingLog, setSavingLog] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      applyTemplate(selectedTemplate);
    }
  }, [isOpen, selectedTemplate, responsibleName, clientName, variables]);

  if (!isOpen) return null;

  // Format Brazilian phone for WhatsApp API
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55')
    ? cleanPhone
    : cleanPhone.length >= 10
    ? `55${cleanPhone}`
    : cleanPhone;

  function applyTemplate(tplKey: WhatsAppTemplateKey) {
    const rawTemplate = WHATSAPP_TEMPLATES[tplKey]?.text || '';
    const displayName = responsibleName || clientName || 'Cliente';
    const filled = rawTemplate
      .replace(/{nome}/g, displayName)
      .replace(/{empresa}/g, clientName || 'sua empresa')
      .replace(/{valor}/g, variables.valor || 'R$ 0,00')
      .replace(/{vencimento}/g, variables.vencimento || 'data acordada')
      .replace(/{plano}/g, variables.plano || 'plano contratado');
    setMessageText(filled);
  }

  const handleLaunchWhatsApp = async () => {
    setSavingLog(true);
    try {
      // Record contact attempt in audit/contact log
      await createContactLog({
        clientId,
        clientName: clientName || 'Cliente',
        type: 'whatsapp',
        templateUsed: WHATSAPP_TEMPLATES[selectedTemplate]?.name || selectedTemplate,
        messageContent: messageText,
        sentBy: userEmail || 'somosraon@gmail.com',
      });
    } catch (err) {
      console.error('Erro ao registrar log de contato:', err);
    } finally {
      setSavingLog(false);
    }

    const encoded = encodeURIComponent(messageText);
    const targetUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#102B59] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#25D366] text-white rounded-xl shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Disparador WhatsApp Raon</h3>
              <p className="text-xs text-slate-300">
                Contato com: <strong className="text-white">{clientName}</strong> ({phone || 'Sem número'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Selecione o Modelo de Mensagem
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                const key = e.target.value as WhatsAppTemplateKey;
                setSelectedTemplate(key);
                applyTemplate(key);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0878D9]"
            >
              {Object.entries(WHATSAPP_TEMPLATES).map(([key, tpl]) => (
                <option key={key} value={key}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7817]" />
                Mensagem Personalizada (Edite livremente antes de abrir)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-[#0878D9] hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
            </div>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0878D9] font-sans"
              placeholder="Digite a mensagem..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * O envio será aberto no WhatsApp Web ou App nativo com a mensagem preenchida e telefone {formattedPhone}. O sistema registrará a tentativa no histórico do cliente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleLaunchWhatsApp}
            disabled={savingLog || !formattedPhone}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm rounded-xl shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};

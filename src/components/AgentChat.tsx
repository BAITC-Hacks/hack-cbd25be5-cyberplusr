import { useEffect, useState } from 'react';

type Result = { answer: string; sources: string[]; trace: { tool: string; gids: string[] }[]; model: string };
type Status = { configured: boolean; graphReady: boolean; model: string };
type Exchange = { question: string; result: Result };
const toolLabels: Record<string, string> = {get_account: 'Карточка счёта', get_neighbors: 'Связи счёта', get_priority: 'Очередь проверки'};

export default function AgentChat({ selectedGid, onSelect }: { selectedGid: string; onSelect: (gid: string) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const refresh = async () => {
    try {
      const response = await fetch('/api/agent/status');
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error();
      setStatus(await response.json()); setError('');
    } catch { setStatus(null); setError('Сервер агента недоступен. Запустите python run.py или agent_server.py по инструкции в README.'); }
  };
  useEffect(() => { if (open) void refresh(); }, [open]);
  const send = async (text: string) => {
    if (busy || !consent || !status?.configured || !status.graphReady || !text.trim()) return;
    setBusy(true); setError('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 170000);
    try {
      const response = await fetch('/api/agent/chat', { method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: text, selectedGid, consent}), signal: controller.signal });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Сервер агента недоступен. Перезапустите проект через run.py.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось получить ответ.');
      setHistory(old => [...old.slice(-9), {question: text, result: data}]); setQuestion('');
    } catch (e) { setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Время ожидания истекло. Попробуйте более короткий вопрос.'); }
    finally { window.clearTimeout(timer); setBusy(false); }
  };
  const enabled = consent && status?.configured && status.graphReady && !busy;
  return <>
    <button className="agent-launch" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="agent-panel">{open ? 'Закрыть помощника' : '✦ ИИ-помощник'}</button>
    {open && <section id="agent-panel" className="agent-panel" aria-label="ИИ-помощник аналитика">
      <header className="agent-header"><div><h2>Помощник аналитика</h2><small>OpenAI · {status?.model || 'подключение'} · только чтение</small></div><button aria-label="Закрыть чат" onClick={() => setOpen(false)}>×</button></header>
      <div className="agent-content">
        <p className="agent-context">Выбранный счёт <strong className="gid-mono">{selectedGid || 'не выбран'}</strong></p>
        {status && !status.configured && <div className="agent-notice">Добавьте API-ключ в файл <code>.env</code> в папке проекта. Образец — <code>.env.example</code>, инструкция — <code>docs/AGENT.md</code>. Ключ не вводится в чат.<button onClick={() => void refresh()}>Проверить подключение</button></div>}
        {status && !status.graphReady && <p className="agent-notice">Сначала рассчитайте локальный граф через run.py.</p>}
        <label className="agent-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
          <span>Разрешаю отправлять в OpenAI мой вопрос, ID выбранного счёта и запрошенные агентом факты графа: ID, суммы, связи, роли и оценки. У меня есть право передавать эти данные.</span></label>
        <div className="agent-suggestions">{['Кого проверить первым?', 'Объясни роль выбранного счёта', 'Покажи связи выбранного счёта'].map(q => <button key={q} disabled={busy} onClick={() => setQuestion(q)}>{q}</button>)}</div>
        <p className="agent-hint">Каждый вопрос — отдельный анализ. История остаётся только на этом экране. API-запросы расходуют баланс OpenAI.</p>
        <div aria-live="polite">{history.map((item, i) => <article className="agent-exchange" key={i}>
          <div className="agent-question">{item.question}</div>
          <div className="agent-answer">{item.result.answer}</div>
          <div className="agent-sources">{item.result.sources.map(gid => <button key={gid} onClick={() => onSelect(gid)}>Открыть {gid} ↗</button>)}</div>
          <details><summary>Проверенные источники · {item.result.trace.length} действий</summary>{item.result.trace.map((t, j) => <p key={j}>{toolLabels[t.tool] || t.tool} · {t.gids.length} счетов</p>)}</details>
        </article>)}{busy && <p role="status">Изучаю данные графа…</p>}</div>
        {error && <p role="alert" className="agent-error">{error}</p>}
      </div>
      <form className="agent-form" onSubmit={e => {e.preventDefault(); void send(question);}}>
        <textarea aria-label="Вопрос ИИ-помощнику" placeholder="Что нужно проверить?" maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} disabled={busy} rows={3}/>
        <div><small>Ответ — гипотеза, проверяйте основания.</small><button type="submit" disabled={!enabled || !question.trim()}>{busy ? 'Анализ…' : 'Отправить'}</button></div>
      </form>
    </section>}
  </>;
}

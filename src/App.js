import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCanLILgOChVFbcITjJe2JdbC",
  authDomain: "nousdeeux-ce98b.firebaseapp.com",
  projectId: "nousdeeux-ce98b",
  storageBucket: "nousdeeux-ce98b.firebasestorage.app",
  messagingSenderId: "290677739010",
  appId: "1:290677739010:web:cb93ef4eb4ab",
  measurementId: "G-4DQ9676PDY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USERS = {
  moi:    { name: "Stew",       color: "#2979FF", emoji: "👨" },
  epouse: { name: "Laurettina", color: "#9C27B0", emoji: "👩" },
  nous:   { name: "Nous deux",  color: "#FF9500", emoji: "💑" },
};

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function mkDate(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

const EMPTY_EVENT = { title: "", timeStart: "", dateEnd: "", recurrence: "none", assignedTo: "moi" };

export default function FamilleApp() {
  const [tab, setTab] = useState("calendar");
  const [currentUser, setCurrentUser] = useState("moi");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({ ...EMPTY_EVENT });
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadEvents, setUnreadEvents] = useState(0);
  const [toast, setToast] = useState(null);

  const today = new Date();
  const todayStr = mkDate(today.getFullYear(), today.getMonth(), today.getDate());

  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  useEffect(() => {
    let first = true;
    const unsub = onSnapshot(collection(db, "events"), snap => {
      const evs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!first) {
        const added = snap.docChanges().filter(c => c.type === "added");
        if (added.length > 0) {
          const e = added[0].doc.data();
          if (e.by !== currentUser) {
            setUnreadEvents(n => n + added.length);
            playNotifSound();
            showToast(`📅 Nouvel événement : ${e.title}`);
          }
        }
      }
      first = false; setEvents(evs);
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    let first = true;
    const unsub = onSnapshot(collection(db, "messages"), snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (!first) {
        const added = snap.docChanges().filter(c => c.type === "added");
        if (added.length > 0) {
          const m = added[0].doc.data();
          if (m.from !== currentUser) {
            setUnreadMessages(n => n + added.length);
            playNotifSound();
            showToast(`💬 ${USERS[m.from]?.name} : ${m.text.slice(0,40)}${m.text.length>40?"...":""}`);
          }
        }
      }
      first = false; setMessages(msgs);
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // For recurring annual events: check if an event appears on this month/day regardless of year
  function getEventsForDay(d) {
    const ds = mkDate(year, month, d);
    const mmdd = ds.slice(5); // MM-DD
    return events.filter(e => {
      if (e.recurrence === "annual" && e.date.slice(5) === mmdd) return true;
      const end = e.dateEnd && e.dateEnd >= e.date ? e.dateEnd : e.date;
      return ds >= e.date && ds <= end;
    });
  }

  async function saveEvent() {
    if (!newEvent.title.trim() || !selectedDay) return;
    const ds = mkDate(year, month, selectedDay);
    const owner = newEvent.assignedTo || currentUser;
    const payload = {
      title: newEvent.title,
      date: ds,
      dateEnd: newEvent.dateEnd && newEvent.dateEnd >= ds ? newEvent.dateEnd : ds,
      color: USERS[owner].color,
      by: owner,
      time: newEvent.timeStart,
      recurrence: newEvent.recurrence || "none",
    };
    if (editingEvent) {
      await updateDoc(doc(db, "events", editingEvent.id), payload);
      setEditingEvent(null);
    } else {
      await addDoc(collection(db, "events"), payload);
    }
    setNewEvent({ ...EMPTY_EVENT, assignedTo: currentUser });
    setShowEventForm(false);
  }

  function startEdit(e) {
    setEditingEvent(e);
    setNewEvent({
      title: e.title,
      timeStart: e.time || "",
      dateEnd: e.dateEnd || e.date,
      recurrence: e.recurrence || "none",
      assignedTo: e.by || currentUser,
    });
    setShowEventForm(true);
  }

  async function deleteEvent(id) { await deleteDoc(doc(db, "events", id)); }

  async function sendMessage() {
    if (!newMsg.trim()) return;
    await addDoc(collection(db, "messages"), {
      from: currentUser, text: newMsg,
      time: `${today.getHours()}:${String(today.getMinutes()).padStart(2,'0')}`,
      date: "Aujourd'hui", timestamp: Date.now()
    });
    setNewMsg("");
  }

  async function toggleItem(id, done) { await updateDoc(doc(db, "items", id), { done: !done }); }
  async function updateItemOwner(id, newOwner) { await updateDoc(doc(db, "items", id), { by: newOwner }); }
  async function addItem() {
    if (!newItem.trim()) return;
    await addDoc(collection(db, "items"), { text: newItem, done: false, by: currentUser });
    setNewItem("");
  }
  async function deleteItem(id) { await deleteDoc(doc(db, "items", id)); }
  async function clearDoneItems() {
    for (const item of items.filter(i => i.done)) await deleteDoc(doc(db, "items", item.id));
  }

  const doneCount = items.filter(i => i.done).length;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Owner picker component (inline)
  function OwnerPicker({ value, onChange, label }) {
    return (
      <div>
        <div style={{ fontSize:11, color:"#9e9cb8", marginBottom:4, fontWeight:700 }}>{label}</div>
        <div style={{ display:"flex", gap:6 }}>
          {Object.entries(USERS).map(([key, u]) => (
            <button key={key} onClick={() => onChange(key)} style={{
              background: value===key ? u.color : "rgba(255,255,255,0.07)",
              border:"none", borderRadius:16, padding:"5px 10px",
              color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer",
              display:"flex", alignItems:"center", gap:3,
              boxShadow: value===key ? `0 0 8px ${u.color}55` : "none",
              transition:"all 0.2s"
            }}>{u.emoji} {u.name}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0F0E17", fontFamily:"'Nunito','Segoe UI',sans-serif", color:"#FFFFFE", display:"flex", flexDirection:"column" }}>

      {toast && (
        <div style={{ position:"fixed", top:16, left:16, right:16, zIndex:9999, background:"linear-gradient(135deg,#1a1830,#2d2850)", border:"1px solid rgba(41,121,255,0.4)", borderRadius:16, padding:"14px 18px", boxShadow:"0 8px 32px rgba(0,0,0,0.5)", fontSize:14, fontWeight:600, animation:"slideDown 0.3s ease" }}>
          <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1830,#231f3a)", borderBottom:"1px solid rgba(41,121,255,0.2)", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>
            💑 <span style={{ background:"linear-gradient(90deg,#2979FF,#9C27B0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>NousDeeux</span>
          </div>
          <div style={{ fontSize:11, color:"#9e9cb8" }}>Votre espace familial</div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[
            { key:"moi", label:"Stew", emoji:"👨" },
            { key:"epouse", label:"Elle", emoji:"👩" },
            { key:"nous", label:"Nous", emoji:"💑" },
          ].map(({ key, label, emoji }) => (
            <button key={key} onClick={() => setCurrentUser(key)} style={{ background:currentUser===key?USERS[key].color:"rgba(255,255,255,0.07)", border:"none", borderRadius:20, padding:"5px 10px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:3, transition:"all 0.2s", boxShadow:currentUser===key?`0 0 12px ${USERS[key].color}55`:"none" }}>
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px", paddingBottom:80 }}>

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <button onClick={() => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }} style={navBtn}>‹</button>
              <span style={{ fontWeight:800, fontSize:18 }}>{MONTHS[month]} {year}</span>
              <button onClick={() => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }} style={navBtn}>›</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, color:"#9e9cb8", fontWeight:700, padding:"4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} />;
                const evs = getEventsForDay(d);
                const ds = mkDate(year, month, d);
                const isToday = ds === todayStr;
                const isSelected = selectedDay === d;
                return (
                  <div key={`d${d}`} onClick={() => { setSelectedDay(d===selectedDay?null:d); setShowEventForm(false); setEditingEvent(null); }} style={{ background:isSelected?"rgba(41,121,255,0.25)":isToday?"rgba(41,121,255,0.1)":"rgba(255,255,255,0.04)", borderRadius:10, padding:"4px 3px", minHeight:48, cursor:"pointer", border:isToday?"1.5px solid #2979FF":isSelected?"1.5px solid rgba(41,121,255,0.6)":"1.5px solid transparent", overflow:"hidden", transition:"all 0.15s" }}>
                    <div style={{ textAlign:"center", fontWeight:isToday?800:500, fontSize:13, color:isToday?"#2979FF":"#FFFFFE", marginBottom:2 }}>{d}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2, overflow:"hidden" }}>
                      {evs.slice(0,2).map(e => (
                        <div key={e.id} style={{ background:e.color, borderRadius:3, fontSize:8, padding:"1px 3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:700, lineHeight:1.3 }}>
                          {e.recurrence==="annual" ? "🔄 " : ""}{e.date.slice(5)===ds.slice(5)||e.date===ds ? e.title : "▶"}
                        </div>
                      ))}
                      {evs.length > 2 && <div style={{ fontSize:8, color:"#9e9cb8", textAlign:"center", fontWeight:700 }}>+{evs.length-2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDay && (
              <div style={{ marginTop:16, background:"rgba(255,255,255,0.05)", borderRadius:16, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{selectedDay} {MONTHS[month]}</div>
                  <button onClick={() => { setShowEventForm(!showEventForm); setEditingEvent(null); setNewEvent({ ...EMPTY_EVENT, assignedTo: currentUser }); }} style={{ background:"linear-gradient(135deg,#2979FF,#9C27B0)", border:"none", borderRadius:20, color:"#fff", padding:"6px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Ajouter</button>
                </div>

                {showEventForm && (
                  <div style={{ background:"rgba(41,121,255,0.1)", borderRadius:12, padding:12, marginBottom:12 }}>
                    <div style={{ fontSize:12, color:"#9e9cb8", marginBottom:8, fontWeight:700 }}>{editingEvent ? "✏️ Modifier l'événement" : "Nouvel événement"}</div>

                    {/* Title */}
                    <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title:e.target.value})} placeholder="Titre..." style={inputStyle} onKeyDown={e => e.key==="Enter" && saveEvent()} />

                    {/* Time + End date */}
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:"#9e9cb8", marginBottom:3 }}>Heure</div>
                        <input type="time" value={newEvent.timeStart} onChange={e => setNewEvent({...newEvent, timeStart:e.target.value})} style={{...inputStyle, colorScheme:"dark"}} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:"#9e9cb8", marginBottom:3 }}>Date de fin</div>
                        <input type="date" value={newEvent.dateEnd} onChange={e => setNewEvent({...newEvent, dateEnd:e.target.value})} style={{...inputStyle, colorScheme:"dark"}} />
                      </div>
                    </div>

                    {/* Recurrence */}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:11, color:"#9e9cb8", marginBottom:4, fontWeight:700 }}>Récurrence</div>
                      <div style={{ display:"flex", gap:6 }}>
                        {[
                          { val:"none", label:"Aucune" },
                          { val:"annual", label:"🔄 Annuelle" },
                        ].map(opt => (
                          <button key={opt.val} onClick={() => setNewEvent({...newEvent, recurrence:opt.val})} style={{ background:newEvent.recurrence===opt.val?"linear-gradient(135deg,#2979FF,#9C27B0)":"rgba(255,255,255,0.07)", border:"none", borderRadius:16, padding:"6px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.2s" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Owner */}
                    <div style={{ marginTop:10 }}>
                      <OwnerPicker value={newEvent.assignedTo} onChange={v => setNewEvent({...newEvent, assignedTo:v})} label="Attribué à" />
                    </div>

                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <button onClick={saveEvent} style={{ flex:1, background:USERS[newEvent.assignedTo]?.color||USERS[currentUser].color, border:"none", borderRadius:10, color:"#fff", padding:"10px", fontWeight:700, cursor:"pointer" }}>{editingEvent ? "✓ Sauvegarder" : "✓ Créer"}</button>
                      {editingEvent && <button onClick={() => { setEditingEvent(null); setShowEventForm(false); }} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:10, color:"#fff", padding:"10px 14px", fontWeight:700, cursor:"pointer" }}>Annuler</button>}
                    </div>
                  </div>
                )}

                {getEventsForDay(selectedDay).length === 0 ? (
                  <div style={{ color:"#9e9cb8", fontSize:14, textAlign:"center", padding:"12px 0" }}>Aucun événement ce jour</div>
                ) : (
                  getEventsForDay(selectedDay).map(e => (
                    <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:e.color, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{e.title}</div>
                        <div style={{ fontSize:11, color:"#9e9cb8" }}>
                          {e.time ? `${e.time} · ` : ""}
                          {e.recurrence==="annual" ? "🔄 Annuel · " : ""}
                          {e.dateEnd && e.dateEnd !== e.date ? `📆 →${e.dateEnd.slice(8)}/${e.dateEnd.slice(5,7)} · ` : ""}
                          {USERS[e.by]?.emoji} {USERS[e.by]?.name}
                        </div>
                      </div>
                      <button onClick={() => startEdit(e)} style={{ background:"none", border:"none", color:"#2979FF", cursor:"pointer", fontSize:15 }}>✏️</button>
                      <button onClick={() => deleteEvent(e.id)} style={{ background:"none", border:"none", color:"#ff5566", cursor:"pointer", fontSize:16 }}>×</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Upcoming */}
            <div style={{ marginTop:20 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:10, color:"#9e9cb8" }}>PROCHAINS ÉVÉNEMENTS</div>
              {[...events]
                .sort((a,b) => a.date.slice(5).localeCompare(b.date.slice(5)))
                .filter(e => {
                  if (e.recurrence==="annual") return true;
                  return (e.dateEnd||e.date) >= todayStr;
                })
                .slice(0,6).map(e => {
                  const d = new Date(e.date + "T12:00:00");
                  return (
                    <div key={e.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"10px 14px" }}>
                      <div style={{ background:e.color, borderRadius:10, width:42, height:42, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:800, lineHeight:1 }}>{d.getDate()}</div>
                        <div style={{ fontSize:10, fontWeight:600, opacity:0.85 }}>{MONTHS[d.getMonth()]?.slice(0,3)}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700 }}>{e.recurrence==="annual"?"🔄 ":""}{e.title}</div>
                        <div style={{ fontSize:12, color:"#9e9cb8" }}>
                          {e.dateEnd && e.dateEnd!==e.date
                            ? `${e.date.slice(8)}/${e.date.slice(5,7)} → ${e.dateEnd.slice(8)}/${e.dateEnd.slice(5,7)}`
                            : (e.time||"Toute la journée")}
                          {" · "}{USERS[e.by]?.emoji} {USERS[e.by]?.name}
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:16 }}>💬 Messages</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {messages.map((m, i) => {
                const isMe = m.from === "moi";
                const u = USERS[m.from];
                const showDate = i === 0 || messages[i-1].date !== m.date;
                return (
                  <div key={m.id}>
                    {showDate && <div style={{ textAlign:"center", color:"#9e9cb8", fontSize:12, margin:"8px 0" }}>{m.date}</div>}
                    <div style={{ display:"flex", flexDirection:isMe?"row-reverse":"row", gap:10, alignItems:"flex-end" }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:u?.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{u?.emoji}</div>
                      <div style={{ background:isMe?"linear-gradient(135deg,#2979FF,#5c9fff)":"rgba(255,255,255,0.08)", borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px", padding:"10px 14px", maxWidth:"70%" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:u?.color, marginBottom:2 }}>{u?.name}</div>
                        <div style={{ fontSize:14 }}>{m.text}</div>
                        <div style={{ fontSize:10, color:isMe?"rgba(255,255,255,0.6)":"#9e9cb8", marginTop:4, textAlign:"right" }}>{m.time}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Écrire un message..." onKeyDown={e => e.key==="Enter" && sendMessage()} style={{...inputStyle, flex:1}} />
              <button onClick={sendMessage} style={{ background:`linear-gradient(135deg,${USERS[currentUser].color},#9C27B0)`, border:"none", borderRadius:12, color:"#fff", padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:18 }}>➤</button>
            </div>
          </div>
        )}

        {/* SHOPPING */}
        {tab === "shopping" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18 }}>🛒 Liste de courses</div>
                <div style={{ fontSize:13, color:"#9e9cb8", marginTop:2 }}>{doneCount}/{items.length} articles cochés</div>
              </div>
              <button onClick={clearDoneItems} style={{ background:"rgba(255,85,102,0.15)", border:"1px solid rgba(255,85,102,0.3)", borderRadius:10, color:"#ff5566", padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>🗑 Effacer cochés</button>
            </div>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, height:6, marginBottom:20, overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(90deg,#2979FF,#9C27B0)", height:"100%", borderRadius:20, width:items.length?`${(doneCount/items.length)*100}%`:"0%", transition:"width 0.4s ease" }} />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ajouter un article..." onKeyDown={e => e.key==="Enter" && addItem()} style={{...inputStyle, flex:1}} />
              <button onClick={addItem} style={{ background:USERS[currentUser].color, border:"none", borderRadius:12, color:"#fff", padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:18 }}>+</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...items.filter(i => !i.done), ...items.filter(i => i.done)].map(item => (
                <div key={item.id} style={{ background:item.done?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.06)", borderRadius:14, padding:"10px 14px", opacity:item.done?0.5:1, transition:"all 0.2s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div onClick={() => toggleItem(item.id, item.done)} style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, border:item.done?"none":`2px solid ${USERS[item.by]?.color}`, background:item.done?USERS[item.by]?.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
                      {item.done && "✓"}
                    </div>
                    <div onClick={() => toggleItem(item.id, item.done)} style={{ flex:1, cursor:"pointer" }}>
                      <div style={{ fontWeight:600, fontSize:15, textDecoration:item.done?"line-through":"none", color:item.done?"#9e9cb8":"#FFFFFE" }}>{item.text}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} style={{ background:"none", border:"none", color:"#ff5566", cursor:"pointer", fontSize:18, opacity:0.6 }}>×</button>
                  </div>
                  {/* Owner picker for each item */}
                  <div style={{ display:"flex", gap:5, marginTop:7, marginLeft:34 }}>
                    {Object.entries(USERS).map(([key, u]) => (
                      <button key={key} onClick={() => updateItemOwner(item.id, key)} style={{ background:item.by===key?u.color:"rgba(255,255,255,0.06)", border:"none", borderRadius:12, padding:"3px 8px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", gap:2, transition:"all 0.15s" }}>
                        {u.emoji} {u.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(15,14,23,0.95)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(41,121,255,0.2)", display:"flex", justifyContent:"space-around", padding:"10px 0 16px" }}>
        {[
          { id:"calendar", icon:"📅", label:"Agenda", badge:unreadEvents },
          { id:"messages", icon:"💬", label:"Messages", badge:unreadMessages },
          { id:"shopping", icon:"🛒", label:"Courses", badge:0 },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if(t.id==="messages")setUnreadMessages(0); if(t.id==="calendar")setUnreadEvents(0); }} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 20px", borderRadius:12, opacity:tab===t.id?1:0.45, transition:"all 0.2s", transform:tab===t.id?"scale(1.1)":"scale(1)", position:"relative" }}>
            <div style={{ fontSize:24, position:"relative" }}>
              {t.icon}
              {t.badge > 0 && <div style={{ position:"absolute", top:-6, right:-8, background:"#ff3b30", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", border:"2px solid #0F0E17" }}>{t.badge>9?"9+":t.badge}</div>}
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:tab===t.id?"#2979FF":"#9e9cb8" }}>{t.label}</div>
            {tab===t.id && <div style={{ width:4, height:4, borderRadius:"50%", background:"#2979FF" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

const navBtn = { background:"rgba(255,255,255,0.08)", border:"none", borderRadius:10, color:"#fff", width:36, height:36, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };
const inputStyle = { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 14px", color:"#FFFFFE", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" };

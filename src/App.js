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
  moi: { name: "Moi", color: "#6C63FF", emoji: "👨" },
  epouse: { name: "Mon épouse", color: "#FF6B9D", emoji: "👩" },
  nous: { name: "Nous deux", color: "#FF9500", emoji: "💑" },
};

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function FamilleApp() {
  const [tab, setTab] = useState("calendar");
  const [currentUser, setCurrentUser] = useState("moi");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "" });
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Firebase listeners
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "messages"), snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(msgs);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Calendar
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getEventsForDay(d) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return events.filter(e => e.date === dateStr);
  }

  async function addEvent() {
    if (!newEvent.title.trim() || !selectedDay) return;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`;
    await addDoc(collection(db, "events"), {
      title: newEvent.title, date: dateStr,
      color: USERS[currentUser].color, by: currentUser, time: newEvent.time
    });
    setNewEvent({ title: "", time: "" });
    setShowEventForm(false);
  }

  async function deleteEvent(id) {
    await deleteDoc(doc(db, "events", id));
  }

  async function sendMessage() {
    if (!newMsg.trim()) return;
    await addDoc(collection(db, "messages"), {
      from: currentUser, text: newMsg,
      time: `${today.getHours()}:${String(today.getMinutes()).padStart(2,'0')}`,
      date: "Aujourd'hui", timestamp: Date.now()
    });
    setNewMsg("");
  }

  async function toggleItem(id, done) {
    await updateDoc(doc(db, "items", id), { done: !done });
  }

  async function addItem() {
    if (!newItem.trim()) return;
    await addDoc(collection(db, "items"), { text: newItem, done: false, by: currentUser });
    setNewItem("");
  }

  async function deleteItem(id) {
    await deleteDoc(doc(db, "items", id));
  }

  async function clearDoneItems() {
    const doneItems = items.filter(i => i.done);
    for (const item of doneItems) {
      await deleteDoc(doc(db, "items", item.id));
    }
  }

  const doneCount = items.filter(i => i.done).length;

  return (
    <div style={{
      minHeight: "100vh", background: "#0F0E17",
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      color: "#FFFFFE", display: "flex", flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1830 0%, #231f3a 100%)",
        borderBottom: "1px solid rgba(108,99,255,0.2)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            💑 <span style={{ background: "linear-gradient(90deg,#6C63FF,#FF6B9D)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>NousDeeux</span>
          </div>
          <div style={{ fontSize: 11, color: "#9e9cb8", marginTop: 1 }}>Votre espace familial</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "moi", label: "Moi", emoji: "👨" },
            { key: "epouse", label: "Elle", emoji: "👩" },
            { key: "nous", label: "Nous", emoji: "💑" },
          ].map(({ key, label, emoji }) => {
            const u = USERS[key];
            return (
              <button key={key} onClick={() => setCurrentUser(key)} style={{
                background: currentUser === key ? u.color : "rgba(255,255,255,0.07)",
                border: "none", borderRadius: 20, padding: "5px 10px",
                color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
                transition: "all 0.2s",
                boxShadow: currentUser === key ? `0 0 12px ${u.color}55` : "none"
              }}>
                {emoji} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: 80 }}>

        {/* CALENDAR TAB */}
        {tab === "calendar" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }} style={navBtn}>‹</button>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{MONTHS[month]} {year}</span>
              <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }} style={navBtn}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, color:"#9e9cb8", fontWeight:700, padding:"4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} />;
                const evs = getEventsForDay(d);
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = selectedDay === d;
                return (
                  <div key={`day-${d}`} onClick={() => { setSelectedDay(d === selectedDay ? null : d); setShowEventForm(false); }} style={{
                    background: isSelected ? "rgba(108,99,255,0.25)" : isToday ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.04)",
                    borderRadius: 10, padding: "4px 3px", minHeight: 48, cursor: "pointer",
                    border: isToday ? "1.5px solid #6C63FF" : isSelected ? "1.5px solid rgba(108,99,255,0.6)" : "1.5px solid transparent",
                    transition: "all 0.15s", overflow: "hidden"
                  }}>
                    <div style={{ textAlign:"center", fontWeight: isToday ? 800 : 500, fontSize: 13, color: isToday ? "#6C63FF" : "#FFFFFE", marginBottom: 3 }}>{d}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap: 2, overflow:"hidden" }}>
                      {evs.slice(0,2).map(e => (
                        <div key={e.id} style={{
                          background: e.color, borderRadius: 3, fontSize: 8, padding: "1px 3px",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                          fontWeight: 700, maxWidth:"100%", lineHeight: 1.3
                        }}>{e.title}</div>
                      ))}
                      {evs.length > 2 && <div style={{ fontSize: 8, color:"#9e9cb8", textAlign:"center", fontWeight:700 }}>+{evs.length-2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDay && (
              <div style={{ marginTop: 16, background:"rgba(255,255,255,0.05)", borderRadius:16, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{selectedDay} {MONTHS[month]}</div>
                  <button onClick={() => setShowEventForm(!showEventForm)} style={{
                    background: "linear-gradient(135deg,#6C63FF,#FF6B9D)", border:"none", borderRadius:20,
                    color:"#fff", padding:"6px 14px", fontWeight:700, fontSize:13, cursor:"pointer"
                  }}>+ Ajouter</button>
                </div>
                {showEventForm && (
                  <div style={{ background:"rgba(108,99,255,0.1)", borderRadius:12, padding:12, marginBottom:12 }}>
                    <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="Titre de l'événement..." style={inputStyle}
                      onKeyDown={e => e.key === "Enter" && addEvent()} />
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                        style={{...inputStyle, flex:1, colorScheme:"dark"}} />
                      <button onClick={addEvent} style={{
                        background: USERS[currentUser].color, border:"none", borderRadius:10,
                        color:"#fff", padding:"8px 16px", fontWeight:700, cursor:"pointer"
                      }}>✓</button>
                    </div>
                  </div>
                )}
                {getEventsForDay(selectedDay).length === 0 ? (
                  <div style={{ color:"#9e9cb8", fontSize:14, textAlign:"center", padding:"12px 0" }}>Aucun événement ce jour</div>
                ) : (
                  getEventsForDay(selectedDay).map(e => (
                    <div key={e.id} style={{
                      display:"flex", alignItems:"center", gap:10, marginBottom:8,
                      background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px"
                    }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:e.color, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{e.title}</div>
                        <div style={{ fontSize:11, color:"#9e9cb8" }}>{e.time && `${e.time} · `}{USERS[e.by]?.emoji} {USERS[e.by]?.name}</div>
                      </div>
                      <button onClick={() => deleteEvent(e.id)} style={{ background:"none", border:"none", color:"#ff5566", cursor:"pointer", fontSize:16 }}>×</button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:10, color:"#9e9cb8" }}>PROCHAINS ÉVÉNEMENTS</div>
              {events.sort((a,b) => a.date.localeCompare(b.date)).slice(0,5).map(e => {
                const d = new Date(e.date);
                const dayN = d.getDate();
                const mon = MONTHS[d.getMonth()]?.slice(0,3);
                return (
                  <div key={e.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10,
                    background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"10px 14px" }}>
                    <div style={{ background:e.color, borderRadius:10, width:42, height:42, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:800, lineHeight:1 }}>{dayN}</div>
                      <div style={{ fontSize:10, fontWeight:600, opacity:0.85 }}>{mon}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>{e.title}</div>
                      <div style={{ fontSize:12, color:"#9e9cb8" }}>{e.time || "Toute la journée"} · {USERS[e.by]?.emoji} {USERS[e.by]?.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
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
                    {showDate && (
                      <div style={{ textAlign:"center", color:"#9e9cb8", fontSize:12, margin:"8px 0" }}>{m.date}</div>
                    )}
                    <div style={{ display:"flex", flexDirection: isMe ? "row-reverse" : "row", gap:10, alignItems:"flex-end" }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background: u?.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                        {u?.emoji}
                      </div>
                      <div style={{
                        background: isMe ? "linear-gradient(135deg,#6C63FF,#8B7FFF)" : "rgba(255,255,255,0.08)",
                        borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        padding:"10px 14px", maxWidth:"70%"
                      }}>
                        <div style={{ fontSize:14 }}>{m.text}</div>
                        <div style={{ fontSize:10, color: isMe ? "rgba(255,255,255,0.6)" : "#9e9cb8", marginTop:4, textAlign:"right" }}>{m.time}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Écrire un message..."
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                style={{...inputStyle, flex:1}} />
              <button onClick={sendMessage} style={{
                background: "linear-gradient(135deg,#6C63FF,#FF6B9D)", border:"none", borderRadius:12,
                color:"#fff", padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:18
              }}>➤</button>
            </div>
          </div>
        )}

        {/* SHOPPING TAB */}
        {tab === "shopping" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18 }}>🛒 Liste de courses</div>
                <div style={{ fontSize:13, color:"#9e9cb8", marginTop:2 }}>{doneCount}/{items.length} articles cochés</div>
              </div>
              <button onClick={clearDoneItems} style={{
                background:"rgba(255,85,102,0.15)", border:"1px solid rgba(255,85,102,0.3)",
                borderRadius:10, color:"#ff5566", padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer"
              }}>🗑 Effacer cochés</button>
            </div>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, height:6, marginBottom:20, overflow:"hidden" }}>
              <div style={{
                background:"linear-gradient(90deg,#6C63FF,#FF6B9D)", height:"100%", borderRadius:20,
                width: items.length ? `${(doneCount/items.length)*100}%` : "0%", transition: "width 0.4s ease"
              }} />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ajouter un article..."
                onKeyDown={e => e.key === "Enter" && addItem()}
                style={{...inputStyle, flex:1}} />
              <button onClick={addItem} style={{
                background: USERS[currentUser].color, border:"none", borderRadius:12,
                color:"#fff", padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:18
              }}>+</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...items.filter(i => !i.done), ...items.filter(i => i.done)].map(item => (
                <div key={item.id} onClick={() => toggleItem(item.id, item.done)} style={{
                  display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                  background: item.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                  borderRadius:14, padding:"12px 14px", transition: "all 0.2s", opacity: item.done ? 0.5 : 1
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:"50%", flexShrink:0,
                    border: item.done ? "none" : `2px solid ${USERS[item.by]?.color}`,
                    background: item.done ? USERS[item.by]?.color : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, transition:"all 0.2s"
                  }}>
                    {item.done && "✓"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:15, textDecoration: item.done ? "line-through" : "none", color: item.done ? "#9e9cb8" : "#FFFFFE" }}>
                      {item.text}
                    </div>
                    <div style={{ fontSize:11, color:"#9e9cb8", marginTop:1 }}>
                      {USERS[item.by]?.emoji} {USERS[item.by]?.name}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} style={{
                    background:"none", border:"none", color:"#ff5566", cursor:"pointer", fontSize:18, opacity:0.6
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background:"rgba(15,14,23,0.95)", backdropFilter:"blur(20px)",
        borderTop:"1px solid rgba(108,99,255,0.2)",
        display:"flex", justifyContent:"space-around", padding:"10px 0 16px"
      }}>
        {[
          { id:"calendar", icon:"📅", label:"Agenda" },
          { id:"messages", icon:"💬", label:"Messages" },
          { id:"shopping", icon:"🛒", label:"Courses" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:3, padding:"6px 20px", borderRadius:12,
            opacity: tab === t.id ? 1 : 0.45, transition:"all 0.2s",
            transform: tab === t.id ? "scale(1.1)" : "scale(1)"
          }}>
            <div style={{ fontSize:24 }}>{t.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color: tab === t.id ? "#6C63FF" : "#9e9cb8" }}>{t.label}</div>
            {tab === t.id && <div style={{ width:4, height:4, borderRadius:"50%", background:"#6C63FF" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

const navBtn = {
  background:"rgba(255,255,255,0.08)", border:"none", borderRadius:10,
  color:"#fff", width:36, height:36, fontSize:20, cursor:"pointer",
  display:"flex", alignItems:"center", justifyContent:"center"
};

const inputStyle = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:12, padding:"10px 14px", color:"#FFFFFE", fontSize:14, outline:"none",
  width:"100%", boxSizing:"border-box"
};

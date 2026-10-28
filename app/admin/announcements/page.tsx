"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
type Announcement = { _id: string; title: string; body: string; status: "draft" | "published" | "hidden" };
export default function Page() { return <><h1>Announcements</h1><Load>{edition => <Manager editionId={edition._id} />}</Load></>; }
function Manager({ editionId }: { editionId: string }) {
  const items = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listAdmin"), { editionId });
  const save = useMutation(mut<{ editionId: string; id?: string; title: string; body: string }, string>("announcements:save"));
  const setStatus = useMutation(mut<{ id: string; status: "published" | "hidden" }, unknown>("announcements:setStatus"));
  const [id, setId] = useState<string | undefined>(), [title, setTitle] = useState(""), [body, setBody] = useState(""), [notice, setNotice] = useState("");
  return <><form className="card" onSubmit={async event => { event.preventDefault(); try { await save({ editionId, id, title, body }); setId(undefined); setTitle(""); setBody(""); setNotice("Draft saved"); } catch (error) { setNotice(String(error)); } }}><h2>{id ? "Edit announcement" : "New announcement"}</h2><label className="field"><span>Title</span><input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="field"><span>Message</span><textarea required maxLength={2000} value={body} onChange={event => setBody(event.target.value)} /></label><button className="button">Save draft</button></form><p role="status">{notice}</p>{items?.map(item => <article className="card" key={item._id}><span className="pill">{item.status}</span><h2>{item.title}</h2><p>{item.body}</p><div className="actions"><button className="button secondary" onClick={() => { setId(item._id); setTitle(item.title); setBody(item.body); }}>Edit</button><button className="button" onClick={async () => { try { await setStatus({ id: item._id, status: "published" }); setNotice("Announcement published"); } catch (error) { setNotice(String(error)); } }}>Publish</button><button className="button secondary" onClick={async () => { try { await setStatus({ id: item._id, status: "hidden" }); setNotice("Announcement hidden"); } catch (error) { setNotice(String(error)); } }}>Hide</button></div></article>)}</>;
}

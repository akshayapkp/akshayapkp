"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FileText, Upload, X, Trash2, ChevronLeft, ChevronRight, Merge,
  Scissors, Minimize2, Image as ImageIcon, FileImage, Unlock, Lock,
  Grid2X2, Crop, Download, Loader2, Plus,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";

interface PDFToolkitProps { onClose: () => void; standalone?: boolean }
type ToolId = "merge" | "split" | "compress" | "image-pdf" | "pdf-image" | "unlock" | "protect" | "organize" | "crop";
interface PickedFile { id: string; file: File; preview?: string }
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const tools: { id: ToolId; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "merge", label: "Merge PDFs & images", icon: <Merge size={17}/>, description: "Combine PDFs and images into one PDF. Drag the cards or use the arrows to set the order." },
  { id: "split", label: "Split PDF", icon: <Scissors size={17}/>, description: "Extract a page range into a new PDF." },
  { id: "compress", label: "Compress PDF", icon: <Minimize2 size={17}/>, description: "Compress PDF streams and remove unused objects without rasterizing text." },
  { id: "image-pdf", label: "Image to PDF", icon: <ImageIcon size={17}/>, description: "Turn JPG, PNG and WebP images into PDF pages." },
  { id: "pdf-image", label: "PDF to image", icon: <FileImage size={17}/>, description: "Render PDF pages as image files." },
  { id: "unlock", label: "Unlock PDF", icon: <Unlock size={17}/>, description: "Remove password encryption using the existing PDF password." },
  { id: "protect", label: "Protect PDF", icon: <Lock size={17}/>, description: "Encrypt a PDF with an AES-256 password." },
  { id: "organize", label: "Organize pages", icon: <Grid2X2 size={17}/>, description: "Rotate, remove and reorder pages." },
  { id: "crop", label: "Crop PDF", icon: <Crop size={17}/>, description: "Set a crop area for every page in the selected PDF." },
];

export default function PDFToolkitTool({ onClose, standalone = false }: PDFToolkitProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<ToolId>("merge");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [outputName, setOutputName] = useState("processed-document.pdf");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [pageOrder, setPageOrder] = useState("");
  const [rotation, setRotation] = useState(90);
  const [cropRect, setCropRect] = useState<{x:number;y:number;width:number;height:number}>({x:0.08,y:0.08,width:0.84,height:0.84});
  const [cropApplyAll, setCropApplyAll] = useState(true);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [cropOutputFormat, setCropOutputFormat] = useState<"pdf"|"jpg">("pdf");
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sameSize, setSameSize] = useState(false);

  const accept = active === "image-pdf" || active === "crop" ? "application/pdf,image/jpeg,image/png,image/webp" : active === "merge" ? "application/pdf,image/jpeg,image/png,image/webp" : "application/pdf";

  const clear = () => {
    files.forEach(x => x.preview && URL.revokeObjectURL(x.preview));
    setFiles([]); setMessage("");
  };
  const chooseTool = (id: ToolId) => {
    clear(); setActive(id);
    const names: Record<ToolId,string> = { merge:"merged-document.pdf", split:"extracted-pages.pdf", compress:"compressed-document.pdf", "image-pdf":"images.pdf", "pdf-image":"", unlock:"unlocked-document.pdf", protect:"protected-document.pdf", organize:"organized-document.pdf", crop:"cropped-document.pdf" };
    setOutputName(names[id]);
  };
  const addFiles = (list: FileList | File[]) => {
    const valid = Array.from(list).filter(f => {
      const pdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const image = f.type.startsWith("image/") && ["image/jpeg","image/png","image/webp"].includes(f.type);
      return active === "image-pdf" ? image : active === "merge" ? pdf || image : active === "crop" ? pdf || image : pdf;
    });
    const mapped = valid.map(file => ({ id: uid(), file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }));
    setFiles(prev => [...prev, ...mapped]); setMessage("");
    if (!valid.length) setMessage("Please select a supported file type.");
  };
  const remove = (id: string) => setFiles(prev => { const item=prev.find(x=>x.id===id); if(item?.preview) URL.revokeObjectURL(item.preview); return prev.filter(x=>x.id!==id); });
  const move = (index:number, delta:number) => setFiles(prev => { const next=[...prev]; const target=index+delta; if(target<0||target>=next.length)return prev; [next[index],next[target]]=[next[target],next[index]]; return next; });
  const download = (blob:Blob, name:string) => { const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),2000); };
  const imageBytes = async (file:File) => { const bitmap=await createImageBitmap(file); const canvas=document.createElement("canvas"); canvas.width=bitmap.width; canvas.height=bitmap.height; const ctx=canvas.getContext("2d"); if(!ctx)throw new Error("Image canvas is unavailable."); ctx.drawImage(bitmap,0,0); bitmap.close(); const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png")); if(!blob)throw new Error("Could not read image."); return new Uint8Array(await blob.arrayBuffer()); };
  const createFromImages = async () => {
    const pdf=await PDFDocument.create();
    for(const item of files){ const bytes=await imageBytes(item.file); const image=await pdf.embedPng(bytes); const pageSize=sameSize?[image.width,image.height] as [number,number]:[595.28,841.89] as [number,number]; const page=pdf.addPage(pageSize); const scale=sameSize?1:Math.min(555/image.width,801/image.height); const w=image.width*scale,h=image.height*scale; page.drawImage(image,{x:(pageSize[0]-w)/2,y:(pageSize[1]-h)/2,width:w,height:h}); }
    return pdf.save({useObjectStreams:true});
  };
  const mergePdfs = async () => {
    const out=await PDFDocument.create();
    for(const item of files){
      if(item.file.type.startsWith("image/")){ const bytes=await imageBytes(item.file); const img=await out.embedPng(bytes); const pageSize=sameSize?[img.width,img.height] as [number,number]:[595.28,841.89] as [number,number]; const page=out.addPage(pageSize); const scale=sameSize?1:Math.min(555/img.width,801/img.height); const w=img.width*scale,h=img.height*scale; page.drawImage(img,{x:(pageSize[0]-w)/2,y:(pageSize[1]-h)/2,width:w,height:h}); }
      else { const src=await PDFDocument.load(await item.file.arrayBuffer()); const pages=await out.copyPages(src,src.getPageIndices()); pages.forEach(p=>out.addPage(p)); }
    }
    return out.save({useObjectStreams:true});
  };
  const process = async () => {
    if(!files.length){setMessage("Please add at least one file.");return;}
    setBusy(true);setMessage("");
    try {
      let bytes:Uint8Array = new Uint8Array(0);
      if(active==="merge") bytes=await mergePdfs();
      else if(active==="image-pdf") bytes=await createFromImages();
      else if(active==="protect"||active==="unlock"||active==="compress") {
        const { load } = await import("@wasm-zoo/qpdf");
        const qpdf = await load();
        try {
          const input = new Uint8Array(await files[0].file.arrayBuffer());
          const inputPath = "/input.pdf";
          const outputPath = "/output.pdf";
          let args: string[];
          if(active==="protect") {
            if(!userPassword.trim() || !ownerPassword.trim()) throw new Error("Enter both a reader password and an owner password.");
            if(userPassword!==confirmPassword) throw new Error("Password confirmation does not match.");
            if(userPassword.length<6 || ownerPassword.length<6) throw new Error("Use passwords with at least 6 characters.");
            args = ["--encrypt", userPassword, ownerPassword, "256", "--", inputPath, outputPath];
          } else if(active==="unlock") {
            if(!unlockPassword) throw new Error("Enter the existing PDF password.");
            args = [`--password=${unlockPassword}`, "--decrypt", inputPath, outputPath];
          } else {
            args = ["--object-streams=generate", "--recompress-flate", "--compression-level=9", inputPath, outputPath];
          }
          const result = await qpdf.exec(args, {
            files: [{ name: inputPath, data: input }],
            outputs: [outputPath],
          });
          const outputFile = result.files.find((file: { name: string }) => file.name === outputPath);
          if (!outputFile) throw new Error(result.stderr || "qpdf did not return a processed PDF.");
          bytes = new Uint8Array(outputFile.data);
        } finally {
          qpdf.dispose();
        }
      } else if(active==="split"||active==="organize"||active==="crop"){
        if(active==="crop" && files[0].file.type.startsWith("image/")) {
          const bitmap=await createImageBitmap(files[0].file);
          const sx=Math.round(cropRect.x*bitmap.width), sy=Math.round(cropRect.y*bitmap.height), sw=Math.max(1,Math.round(cropRect.width*bitmap.width)), sh=Math.max(1,Math.round(cropRect.height*bitmap.height));
          const canvas=document.createElement("canvas");canvas.width=sw;canvas.height=sh;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Image canvas unavailable.");ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,sw,sh);bitmap.close();
          if(cropOutputFormat==="jpg"){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.94));if(!blob)throw new Error("Could not create JPG.");download(blob,(files[0].file.name.replace(/\\.[^.]+$/,"")||"cropped-image")+".jpg");setMessage("Done. Cropped JPG downloaded.");return;}
          const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.94));if(!blob)throw new Error("Could not create image.");const out=await PDFDocument.create();const img=await out.embedJpg(await blob.arrayBuffer());const page=out.addPage([sw,sh]);page.drawImage(img,{x:0,y:0,width:sw,height:sh});bytes=await out.save({useObjectStreams:true});
        } else if(active==="crop" && cropOutputFormat==="jpg") {
          const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/legacy/build/pdf.worker.mjs",import.meta.url).toString();
          const task=pdfjs.getDocument({data:new Uint8Array(await files[0].file.arrayBuffer())});const doc=await task.promise;const zipModule=await import("jszip");const zip=new zipModule.default();
          for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i);const viewport=pg.getViewport({scale:2});const source=document.createElement("canvas");source.width=viewport.width;source.height=viewport.height;const sctx=source.getContext("2d");if(!sctx)throw new Error("Canvas unavailable.");await pg.render({canvas:source,canvasContext:sctx,viewport}).promise;const x=Math.round(cropRect.x*source.width),y=Math.round(cropRect.y*source.height),w=Math.max(1,Math.round(cropRect.width*source.width)),h=Math.max(1,Math.round(cropRect.height*source.height));const outCanvas=document.createElement("canvas");outCanvas.width=w;outCanvas.height=h;const octx=outCanvas.getContext("2d");if(!octx)throw new Error("Canvas unavailable.");octx.drawImage(source,x,y,w,h,0,0,w,h);const blob=await new Promise<Blob|null>(resolve=>outCanvas.toBlob(resolve,"image/jpeg",.94));if(!blob)throw new Error("Could not create JPG page.");zip.file("page-"+i+".jpg",blob);source.width=source.height=outCanvas.width=outCanvas.height=0;}
          const zipped=await zip.generateAsync({type:"blob"});download(zipped,(files[0].file.name.replace(/\\.pdf$/i,"")||"cropped-pages")+"-jpg.zip");setMessage("Done. Cropped JPG pages downloaded in a ZIP file.");return;
        }
        const pdf=active==="crop" && files[0].file.type.startsWith("image/")?null:await PDFDocument.load(await files[0].file.arrayBuffer());
        if(!pdf){ /* image crop output PDF is ready in bytes */ } else {
        const total=pdf!.getPageCount();
        if(active==="split"){
          const start=Math.max(1,Math.min(fromPage,total))-1; const end=Math.max(start+1,Math.min(toPage,total));
          const out=await PDFDocument.create(); const pages=await out.copyPages(pdf,Array.from({length:end-start},(_,i)=>start+i)); pages.forEach(p=>out.addPage(p)); bytes=await out.save({useObjectStreams:true});
        } else if(active==="organize"){
          pdf.getPages().forEach(p=>p.setRotation(degrees(p.getRotation().angle+rotation)));
          const order=pageOrder.split(",").map(x=>Number(x.trim())-1).filter(x=>Number.isInteger(x)&&x>=0&&x<total);
          if(order.length){ const out=await PDFDocument.create(); const copied=await out.copyPages(pdf,order); copied.forEach(p=>out.addPage(p)); bytes=await out.save({useObjectStreams:true}); }
          else bytes=await pdf.save({useObjectStreams:true});
        } else {
          const pages=pdf!.getPages(); const targets=cropApplyAll?pages:[pages[0]];
          targets.forEach(p=>{const {width,height}=p.getSize();const x=cropRect.x*width;const w=cropRect.width*width;const h=cropRect.height*height;const y=height-(cropRect.y+cropRect.height)*height;p.setCropBox(x,y,w,h);});
          bytes=await pdf!.save({useObjectStreams:true});
        }
        }
      } else if(active==="pdf-image") {
        const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/legacy/build/pdf.worker.mjs",import.meta.url).toString();
        const task=pdfjs.getDocument({data:new Uint8Array(await files[0].file.arrayBuffer())});
        const doc=await task.promise;
        const zipModule=await import("jszip"); const zip=new zipModule.default();
        for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const viewport=page.getViewport({scale:1.7});const canvas=document.createElement("canvas");canvas.width=viewport.width;canvas.height=viewport.height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable.");await page.render({canvas,canvasContext:ctx,viewport}).promise;const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw new Error("Could not render PDF page.");zip.file(`page-${i}.png`,blob);canvas.width=0;canvas.height=0;}
        const zipped=await zip.generateAsync({type:"blob"});download(zipped, (files[0].file.name.replace(/\\.pdf$/i,"")||"pdf-pages")+".zip");setMessage("PDF pages exported as PNG images in a ZIP file.");return;
      } else throw new Error("This operation is not available.");
      const safeName=(outputName.trim()||"processed-document").replace(/\.pdf$/i,"")+".pdf";
      const buffer=new ArrayBuffer(bytes.byteLength);new Uint8Array(buffer).set(bytes);download(new Blob([buffer],{type:"application/pdf"}),safeName);
      setMessage(active==="compress" ? "Compression completed. File size: "+(files[0].file.size/1024).toFixed(1)+" KB → "+(bytes.byteLength/1024).toFixed(1)+" KB." : "Done. Your file has been created and downloaded.");
    } catch(error) { console.error("PDF Manager:",error);setMessage(error instanceof Error?error.message:"PDF processing failed. Please check the selected file."); }
    finally {setBusy(false);}
  };

  const current=tools.find(t=>t.id===active)!;
  return (
    <div className={standalone ? "flex h-full min-h-0 w-full items-stretch justify-center overflow-hidden bg-[#f1efff]" : "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"}>
      <section className={standalone ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f4f3ff]" : "flex h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[24px] border border-indigo-100 bg-[#f4f3ff] shadow-2xl"}>
        <header className="flex shrink-0 items-center justify-between border-b border-indigo-100 bg-white/90 px-5 py-3">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow"><FileText size={22}/></div><div><h2 className="text-lg font-black text-slate-900">PDF Manager</h2><p className="text-xs text-slate-500">Merge, split, compress, convert, protect & more</p></div></div>
          {!standalone && <button onClick={onClose} aria-label="Close PDF Manager" className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button>}
        </header>
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden bg-gradient-to-br from-[#f1efff] via-[#edf5ff] to-[#e7f8ff] p-3">
          <aside className="w-[205px] shrink-0 overflow-y-auto rounded-2xl border border-white bg-white/80 p-3 shadow-sm max-sm:w-[150px]">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-extrabold text-slate-800"><Grid2X2 size={16} className="text-indigo-500"/> Tools</div>
            <nav className="space-y-1.5">{tools.map(t=><button key={t.id} onClick={()=>chooseTool(t.id)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${active===t.id?"border-transparent bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-md":"border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"}`}>{t.icon}<span>{t.label}</span></button>)}</nav>
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto rounded-2xl border border-white/90 bg-white/65 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-base font-black text-slate-900">{current.icon}{current.label}</h1><p className="mt-1 text-xs text-slate-500">{current.description}</p></div><div className="flex gap-2">{files.length>0&&<button onClick={()=>inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"><Plus size={15}/> Add files</button>}{files.length>0&&<button onClick={clear} className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-50"><Trash2 size={14}/> Clear all</button>}</div></div>
            <input ref={inputRef} type="file" accept={accept} multiple={active==="merge"||active==="image-pdf"} className="hidden" onChange={e=>{if(e.target.files)addFiles(e.target.files);e.currentTarget.value="";}}/>
            {files.length===0?<button type="button" onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}} className="mb-4 flex min-h-[150px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-white/70 p-6 text-center text-xs text-slate-600 hover:border-indigo-500 hover:bg-indigo-50"><Upload className="mb-2 text-indigo-600" size={30}/><span className="text-sm font-extrabold text-indigo-700">Drop files here or Click to Add File</span><span className="mt-1">Choose a file from your device</span></button>:<div onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}} className="mb-4 rounded-xl border border-dashed border-indigo-200 bg-white/50 p-3 text-center text-[11px] text-slate-500">Drop more files here, or <button type="button" onClick={()=>inputRef.current?.click()} className="font-bold text-indigo-700 underline">+ Add Files</button></div>}
            {files.length>0&&<><p className="mb-3 text-xs font-bold text-slate-600">{files.length} file(s) - drag the cards to change the order</p><div className="mb-4 flex flex-wrap gap-3">{files.map((item,index)=><article key={item.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(index))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=Number(e.dataTransfer.getData("text/plain"));setFiles(prev=>{const next=[...prev];const [moved]=next.splice(from,1);next.splice(index,0,moved);return next;});}} className="relative w-[180px] rounded-2xl border border-indigo-100 bg-white p-2.5 shadow-[0_8px_22px_rgba(65,95,150,0.12)]"><button onClick={()=>remove(item.id)} className="absolute right-1.5 top-1.5 z-10 rounded-full bg-rose-500 p-1 text-white shadow" aria-label="Remove file"><X size={13}/></button><button type="button" onClick={()=>{if(active==="crop")setCropEditorOpen(true);}} className="mb-2 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100" title={active==="crop"?"Open Crop Editor":item.file.name}>{item.preview?<img src={item.preview} alt={item.file.name} className="h-full w-full object-contain"/>:active==="crop"&&item.file.type==="application/pdf"?<PdfThumbnail file={item.file}/>:<div className="text-center text-indigo-500"><FileText size={36} className="mx-auto"/><span className="mt-1 block text-[10px] font-bold">PDF</span></div>}</button><p className="truncate text-xs font-bold text-slate-800" title={item.file.name}>{item.file.name}</p><p className="text-[10px] text-slate-500">{(item.file.size/1024).toFixed(1)} KB</p><div className="mt-2 flex gap-1"><button onClick={()=>move(index,-1)} disabled={index===0} className="flex-1 rounded-lg border border-indigo-100 py-1 text-indigo-600 disabled:opacity-30" aria-label="Move left"><ChevronLeft size={15} className="mx-auto"/></button><button onClick={()=>move(index,1)} disabled={index===files.length-1} className="flex-1 rounded-lg border border-indigo-100 py-1 text-indigo-600 disabled:opacity-30" aria-label="Move right"><ChevronRight size={15} className="mx-auto"/></button></div></article>)}</div></>}
            {active==="merge"&&<div className="mb-4 rounded-2xl border border-indigo-100 bg-white/70 p-3"><p className="mb-2 text-xs font-bold text-slate-700">Images become pages of size</p><div className="flex gap-2"><button onClick={()=>setSameSize(false)} className={`rounded-full border px-4 py-2 text-xs font-bold ${!sameSize?"border-indigo-300 bg-white text-indigo-700 shadow":"border-transparent bg-indigo-100 text-slate-500"}`}>A4 (fit the picture)</button><button onClick={()=>setSameSize(true)} className={`rounded-full border px-4 py-2 text-xs font-bold ${sameSize?"border-indigo-300 bg-white text-indigo-700 shadow":"border-transparent bg-indigo-100 text-slate-500"}`}>Same size as the picture</button></div></div>}
            {active==="split"&&<div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-4"><label className="text-xs font-bold text-slate-700">From page<input type="number" min={1} value={fromPage} onChange={e=>setFromPage(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"/></label><label className="text-xs font-bold text-slate-700">To page<input type="number" min={1} value={toPage} onChange={e=>setToPage(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"/></label></div>}
            {active==="organize"&&<div className="mb-4 space-y-3 rounded-2xl border border-indigo-100 bg-white/70 p-4"><div><label className="text-xs font-bold text-slate-700">Rotate all pages</label><div className="mt-2 flex gap-2">{[90,180,270].map(v=><button key={v} onClick={()=>setRotation(v)} className={`rounded-lg border px-4 py-2 text-xs font-bold ${rotation===v?"border-indigo-500 bg-indigo-600 text-white":"border-slate-200 bg-white text-slate-600"}`}>{v}°</button>)}</div></div><label className="block text-xs font-bold text-slate-700">Custom page order (comma separated, e.g. 3,1,2)<input value={pageOrder} onChange={e=>setPageOrder(e.target.value)} placeholder="Leave empty to keep original order" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"/></label><p className="text-[11px] text-slate-500">To remove pages, specify only the page numbers you want to keep in the custom order.</p></div>}
            {active==="crop"&&files[0]&&<div className="mb-4 rounded-xl border border-indigo-100 bg-white/70 p-3"><p className="text-xs text-slate-600">Preview-യിൽ ക്ലിക്ക് ചെയ്ത് crop area സെറ്റ് ചെയ്യുക. Output format:</p><div className="mt-2 flex gap-2"><button type="button" onClick={()=>setCropOutputFormat("pdf")} className={"rounded-full border px-4 py-2 text-xs font-bold "+(cropOutputFormat==="pdf"?"bg-indigo-600 text-white":"bg-white text-slate-600")}>PDF</button><button type="button" onClick={()=>setCropOutputFormat("jpg")} className={"rounded-full border px-4 py-2 text-xs font-bold "+(cropOutputFormat==="jpg"?"bg-indigo-600 text-white":"bg-white text-slate-600")}>JPG</button></div></div>}
            {active==="compress"&&<div className="mb-4 rounded-2xl border border-indigo-100 bg-white/70 p-4 text-xs text-slate-600"><p className="font-bold">Optimize PDF streams and remove unused objects</p><p className="mt-1 pl-5">Powered by qpdf WebAssembly. Recompresses streams and cleans unused objects without rasterizing text or downsampling images. Actual size reduction depends on the PDF.</p></div>}
            {active==="pdf-image"&&<div className="mb-4 rounded-2xl border border-indigo-100 bg-white/70 p-4 text-xs text-slate-600">Each page is rendered to PNG and downloaded together as a ZIP archive.</div>}
            {active==="protect"&&<div className="mb-4 grid gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Open / user password<input type="password" autoComplete="new-password" value={userPassword} onChange={e=>setUserPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" placeholder="Password required to open PDF"/></label><label className="text-xs font-bold text-slate-700">Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" placeholder="Re-enter password"/></label><label className="text-xs font-bold text-slate-700 sm:col-span-2">Owner password (required)<input type="password" autoComplete="new-password" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" placeholder="Set a separate owner password"/></label><p className="text-[11px] text-slate-500 sm:col-span-2">AES-256 encryption. Reader password opens the file; owner password controls PDF permissions.</p></div>}{active==="unlock"&&<div className="mb-4 rounded-2xl border border-indigo-100 bg-white/70 p-4"><label className="text-xs font-bold text-slate-700">Current PDF password<input type="password" autoComplete="current-password" value={unlockPassword} onChange={e=>setUnlockPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" placeholder="Enter existing PDF password"/></label><p className="mt-2 text-[11px] text-slate-500">Only unlock PDFs you own or are authorized to modify.</p></div>}
            <div className="mb-4 rounded-2xl border border-indigo-100 bg-white/70 p-3"><label className="text-xs font-bold text-slate-700">Filename after processing</label><div className="mt-1 flex items-center gap-2"><input value={outputName} onChange={e=>setOutputName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"/><span className="text-xs text-slate-500">.pdf</span></div></div>
            <div className="flex flex-wrap items-center gap-3"><button disabled={busy||!files.length} onClick={process} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:brightness-105 disabled:opacity-40">{busy?<Loader2 size={16} className="animate-spin"/>:<Download size={16}/>} {busy?"Processing...":active==="merge"?"Merge files":active==="split"?"Split PDF":active==="image-pdf"?"Create PDF":active==="pdf-image"?"Convert to images":"Process PDF"}</button>{message&&<p role="status" className={`text-xs font-semibold ${message.startsWith("Done")||message.startsWith("PDF pages")?"text-emerald-700":"text-rose-600"}`}>{message}</p>}</div>
            <p className="mt-5 text-center text-[10px] text-slate-500">Files are processed locally in your browser. They are not uploaded to Akshaya PKP servers.</p>
          </main>
        </div>
      </section>
      {cropEditorOpen&&files[0]&&<div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/75 p-2 sm:p-5"><section className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-4"><div><h2 className="font-black text-slate-900">Crop PDF</h2><p className="text-xs text-slate-500">{files[0].file.name}</p></div><button type="button" onClick={()=>setCropEditorOpen(false)} className="rounded-full border px-3 py-2">✕</button></header><div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5"><CropPreview file={files[0].file} rect={cropRect} onChange={setCropRect}/><label className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 text-xs font-bold"><input type="checkbox" checked={cropApplyAll} onChange={e=>setCropApplyAll(e.target.checked)} className="accent-indigo-600"/> Apply same crop area to all pages</label></div><footer className="flex justify-end border-t p-3"><button type="button" onClick={()=>setCropEditorOpen(false)} className="rounded-full bg-indigo-600 px-6 py-2 text-xs font-bold text-white">Done</button></footer></section></div>}
    </div>
  );
}

function CropPreview({file,rect,onChange}:{file:File;rect:{x:number;y:number;width:number;height:number};onChange:(r:{x:number;y:number;width:number;height:number})=>void}) {
 const canvasRef=useRef<HTMLCanvasElement>(null); const [count,setCount]=useState(0); const [page,setPage]=useState(1); const [start,setStart]=useState<{x:number;y:number}|null>(null); const [draft,setDraft]=useState(rect);
 useEffect(()=>{let dead=false;let task:any;(async()=>{try{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;if(file.type.startsWith("image/")){const bitmap=await createImageBitmap(file);if(dead)return;const scale=Math.min(1.15,520/bitmap.width);canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();setCount(1);return;}const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/legacy/build/pdf.worker.mjs",import.meta.url).toString();task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const doc=await task.promise;if(dead)return;setCount(doc.numPages);const p=await doc.getPage(page);const base=p.getViewport({scale:1});const viewport=p.getViewport({scale:Math.min(1.15,520/base.width)});canvas.width=viewport.width;canvas.height=viewport.height;await p.render({canvas,canvasContext:ctx,viewport}).promise;}catch(err){console.error("Crop preview",err);}})();return()=>{dead=true;task?.destroy?.();};},[file,page]);
 const coords=(e:React.PointerEvent<HTMLDivElement>)=>{const b=e.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};};
 const down=(e:React.PointerEvent<HTMLDivElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);const p=coords(e);setStart(p);setDraft({x:p.x,y:p.y,width:.01,height:.01});};
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{if(!start)return;const p=coords(e);setDraft({x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),width:Math.max(.01,Math.abs(p.x-start.x)),height:Math.max(.01,Math.abs(p.y-start.y))});};
 const up=()=>{if(start){onChange(draft);setStart(null);}};
 const shown=start?draft:rect;
 return <div className="rounded-xl border border-slate-200 bg-slate-100 p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700"><span>Crop - Page {page} of {count||"…"}</span><div className="flex gap-2"><button type="button" disabled={page<=1} onClick={()=>setPage(n=>n-1)} className="rounded border bg-white px-3 py-1 disabled:opacity-40">‹</button><button type="button" disabled={!count||page>=count} onClick={()=>setPage(n=>n+1)} className="rounded border bg-white px-3 py-1 disabled:opacity-40">›</button></div></div><div className="flex justify-center overflow-auto"><div className="relative inline-block max-w-full touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><canvas ref={canvasRef} className="block h-auto max-h-[65vh] max-w-full bg-white shadow"/><div className="pointer-events-none absolute border-2 border-blue-600 bg-blue-300/15" style={{left:(shown.x*100)+"%",top:(shown.y*100)+"%",width:(shown.width*100)+"%",height:(shown.height*100)+"%"}}/></div></div><p className="mt-2 text-center text-[10px] text-slate-500">Drag on the page to draw a crop box</p></div>;
}

function PdfThumbnail({file}:{file:File}) { const ref=useRef<HTMLCanvasElement>(null); useEffect(()=>{let dead=false;let task:any;(async()=>{try{const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const doc=await task.promise;if(dead)return;const page=await doc.getPage(1);const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(.5,140/base.width)});const canvas=ref.current;if(!canvas)return;canvas.width=viewport.width;canvas.height=viewport.height;const ctx=canvas.getContext("2d");if(ctx)await page.render({canvas,canvasContext:ctx,viewport}).promise;}catch(e){console.error("PDF thumbnail",e);}})();return()=>{dead=true;task?.destroy?.();};},[file]);return <canvas ref={ref} className="max-h-full max-w-full bg-white object-contain shadow-sm"/>; }

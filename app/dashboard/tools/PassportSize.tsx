"use client";

import { useRouter } from "next/navigation";
import { Camera, Upload, X } from "lucide-react";
import { usePassportSize } from "../hooks/usePassportSize";
import RectCropDialog from "../components/RectCropDialog";
import PassportPhotoEnhancements from "./PassportPhotoEnhancements";

export default function PassportSize({ onClose, standalone = false }: { onClose?: () => void; standalone?: boolean }) {
  const router = useRouter();
  const {
    fileInputRef,
    image,
    cropOpen,
    setCropOpen,
    cropImage,
    setCropImage,
    setImage,
    handleSelectImage,
    openFilePicker,
  } = usePassportSize();

  const close = onClose ?? (() => router.push("/dashboard"));
  const handleCropSave = (cropped: string) => {
    setImage(cropped);
    setCropImage(null);
    setCropOpen(false);
  };

  return (
    <main className={standalone ? "h-full min-h-0 w-full overflow-x-hidden overflow-y-auto bg-slate-50 p-2 sm:p-3" : "min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5 sm:py-6"}>
      <div className={standalone ? "mx-auto w-full max-w-none" : "mx-auto w-full max-w-7xl"}>
        {!standalone && <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white"><Camera size={20}/></span>
            <div className="min-w-0"><h1 className="truncate text-lg font-black text-slate-800 sm:text-xl">Passport Photo Creator</h1><p className="text-xs text-slate-500">Advanced photo editing and print studio</p></div>
          </div>
          <button type="button" onClick={close} aria-label="Close Passport Photo Creator" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"><X size={19}/></button>
        </header>}

        <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={handleSelectImage}/>
        <PassportPhotoEnhancements
          image={image}
          onChoosePhoto={openFilePicker}
          onCropAgain={() => {
            if (image) {
              setCropImage(image);
              setCropOpen(true);
            } else {
              openFilePicker();
            }
          }}
        />
      </div>

      <RectCropDialog
        targetAspect={35 / 45}
        open={cropOpen}
        image={cropImage}
        onCancel={() => { setCropOpen(false); setCropImage(null); }}
        onDone={handleCropSave}
      />
    </main>
  );
}

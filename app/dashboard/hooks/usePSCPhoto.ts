"use client";

import { ChangeEvent, useRef, useState } from "react";

type Position = { x: number; y: number };

export function usePSCPhoto() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [photoDate, setPhotoDate] = useState("");
  const [nameFontSize, setNameFontSize] = useState(14);
  const [dateFontSize, setDateFontSize] = useState(12);
  const [zoom, setZoom] = useState(120);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  const dragging = useRef(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });

  const reset = () => {
    setPhoto(null);
    setFileName("");
    setApplicantName("");
    setPhotoDate("");
    setNameFontSize(14);
    setDateFontSize(12);
    setZoom(120);
    setPosition({ x: 0, y: 0 });
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(reader.result as string);
      setZoom(120);
      setPosition({ x: 0, y: 0 });
    };

    reader.readAsDataURL(file);
  };

  const startDrag = (x: number, y: number) => {
    dragging.current = true;
    dragStart.current = {
      x: x - position.x,
      y: y - position.y,
    };
  };

  const moveDrag = (x: number, y: number) => {
    if (!dragging.current) return;

    setPosition({
      x: x - dragStart.current.x,
      y: y - dragStart.current.y,
    });
  };

  const stopDrag = () => {
    dragging.current = false;
  };

  const download = () => {
    if (!photo) return;

    const image = new Image();
    image.src = photo;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return;

      const width = 150;
      const height = 200;

      const photoHeight = 165;

      canvas.width = width;
      canvas.height = height;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      /*
       * Preview photo area is 225px wide.
       * Download photo area is 150px wide.
       *
       * Therefore preview drag position must be converted
       * from preview pixels to download pixels.
       */
      const previewWidth = 225;
      const positionScale = width / previewWidth;

      const downloadX = position.x * positionScale;
      const downloadY = position.y * positionScale;

      context.save();

      context.beginPath();
      context.rect(0, 0, width, photoHeight);
      context.clip();

      context.translate(width / 2, photoHeight / 2);

      const scale =
        (width / image.width) * (zoom / 100);

      context.scale(scale, scale);

      /*
       * Convert the preview drag position to the
       * corresponding download position.
       */
      context.translate(
        downloadX / scale,
        downloadY / scale
      );

      context.drawImage(
        image,
        -image.width / 2,
        -image.height / 2
      );

      context.restore();

      context.textAlign = "center";
      context.textBaseline = "middle";

      // Applicant name
      context.fillStyle = "#000000";
      context.font = `bold ${Math.max(
        10,
        nameFontSize
      )}px Arial`;

      context.fillText(
        (applicantName || "NAME").toUpperCase(),
        width / 2,
        176
      );

      // Date
      // Same dark colour as the applicant name
      context.fillStyle = "#000000";
      context.font = `${Math.max(
        8,
        dateFontSize
      )}px Arial`;

      context.fillText(
        photoDate || "DD-MM-YYYY",
        width / 2,
        192
      );

      let quality = 0.9;

      const save = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return;

            if (
              blob.size > 30 * 1024 &&
              quality > 0.1
            ) {
              quality -= 0.05;
              save();
              return;
            }

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "psc_photo.jpg";
            link.click();

            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          quality
        );
      };

      save();
    };
  };

  return {
    photo,
    fileName,

    applicantName,
    setApplicantName,

    photoDate,
    setPhotoDate,

    nameFontSize,
    setNameFontSize,

    dateFontSize,
    setDateFontSize,

    zoom,
    setZoom,

    position,

    uploadPhoto,
    startDrag,
    moveDrag,
    stopDrag,

    reset,
    download,
  };
}
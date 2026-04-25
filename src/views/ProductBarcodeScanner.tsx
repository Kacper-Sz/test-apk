import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRepeat, ChevronLeft } from "react-bootstrap-icons";

const ProductBarcodeScanner: React.FC = () => {
  const { id: containerId } = useParams<{ id: string }>();

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [mediaDevice, setMediaDevice] = useState<number>(0);
  //const [result, setResult] = useState<string>("");
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);

  const codeReader = useRef(new BrowserMultiFormatReader());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    codeReader.current.listVideoInputDevices().then(setVideoDevices);
  }, []);

  useEffect(() => {
    if (!videoRef.current || videoDevices.length === 0) return;

    const device = videoDevices[mediaDevice];

    codeReader.current.decodeFromVideoDevice(
      device.deviceId,
      videoRef.current,
      (res) => {
        if(!res) return;
        setIsOverlayVisible(true);
        window.location.href = `https://pl.openfoodfacts.org/product/${res.getText()}`;
      }
    );

    return () => codeReader.current.reset();
  }, [mediaDevice, videoDevices]);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const tryPlay = async () => {
      try {
        await video.play();
      } catch (e) {
        console.error("Video play failed:", e);
      }
    };

    tryPlay();
  }, [videoDevices, mediaDevice]);

  return (
    <div className="vh-100 overflow-hidden bg-dark">
      {/* Podgląd kamery */}
      <video
        key={mediaDevice}
        ref={videoRef}
        muted
        playsInline
      />

      {/* Nagłówek skanera kodów kreskowych */}
      <div className="barcode-scanner-header fixed-top container-fluid d-flex">
        <div className="d-flex align-items-center" onClick={() => navigate(`/containers/${containerId}/add-product`)}>
          <ChevronLeft className="me-3" color={"white"} size={"28"}/>
          <h1 className="mb-0 text-white">Powrót</h1>
        </div>
      </div>

      {/* Przycisk zmiany kamery */}
      <div className="position-absolute bottom-0 end-0 m-3 d-flex flex-row align-items-center gap-2">
        <h1 className="text-white mb-0">{mediaDevice+1}</h1>
        <ArrowRepeat color={"white"} size={"48"} onClick={() => {
          codeReader.current.reset();
          setMediaDevice((prev) =>
            (prev + 1) % videoDevices.length
          );
        }} />
      </div>
      
      {/* Instrukcje skanera */}
      <div className="position-absolute top-50 start-0 text-center text-white p-3 d-flex align-items-center justify-content-center">
        <p>Skieruj kamerę na kod kreskowy lub kod QR, a my postaramy się znaleźć informacje o produkcie!</p>
      </div>

      {/* Overlay skanera */}
      <div className={ (isOverlayVisible ? "" : "d-none ") + "bg-black bg-opacity-50 position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" }>
        <div className="position-absolute top-50 start-50 translate-middle text-center bg-light p-4 rounded">
          <p className="text-dark">Szukam informacji o produkcie...</p>
        </div>
      </div>

    </div>
  );
};

export default ProductBarcodeScanner;
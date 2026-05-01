import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRepeat, ChevronLeft, Hammer } from "react-bootstrap-icons";
import type { BarcodeProductInfo } from "./types/models";
import { Button } from "react-bootstrap";

const DEBUG_BARCODE = "5906734830713";

const ProductBarcodeScanner: React.FC = () => {
  const { id: containerId } = useParams<{ id: string }>();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [isDoneSwitching, setIsDoneSwitching] = useState<boolean>(true);
  const [result, setResult] = useState<BarcodeProductInfo | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [selectedCamera, setSelectedCamera] = useState<number>(() => {
    const saved = localStorage.getItem("selectedCamera");
    return saved ? Number(saved) : 0;
  });
  const codeReader = useRef(new BrowserMultiFormatReader());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();

  const loadVideoDevices = async () => {
    try {
      const devices = await codeReader.current.listVideoInputDevices();
      setVideoDevices(devices);
    } catch (err) {
      console.error("Error loading video devices:", err);
    }
  };
  const startScanner = () => {
    if (!videoRef.current || videoDevices.length === 0) return;
    const device = videoDevices[selectedCamera];

    codeReader.current.decodeFromVideoDevice(
      device.deviceId,
      videoRef.current,
      (res) => {
        if(!isDoneSwitching) setIsDoneSwitching(true);
        if(!res) return;
        setIsOverlayVisible(true);
        fetchProductInfo(res.getText()).then((value) => setResult(value));
      }
    );
  };
  const stopScanner = () => {
    codeReader.current.reset();
  };
  const fetchProductInfo = async (barcode: string) : Promise<BarcodeProductInfo | null> => {
    try {
      const url = `https://pl.openfoodfacts.org/api/v0/product/${barcode}.json`;
      const params = new URLSearchParams({
        cc: "pl",
        lc: "pl",
        fields: "product_name_pl,image_url,brands,product_quantity,product_quantity_unit"
      });
      const response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: {
          "User-Agent": "CartonApp - Multiplatform - Version 0.1"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      };
      const result = await response.json();
      const returnItem: BarcodeProductInfo = {
        code: barcode,
        status: result.status
      };
      if(returnItem.status == 1){
        returnItem.product = {
          name: result.product.product_name_pl,
          image_url: result.product.image_url,
          brand: result.product.brands,
          capacity: result.product.product_quantity,
          unit: result.product.product_quantity_unit
        }
      }
      return returnItem;
    }
    catch (err) {
      console.error("Error fetching product info:", err);
      return null;
    }
  };

  // Wywoływane zaraz po załadowaniu komponentu do widoku
  useEffect(() => {
    loadVideoDevices();
  }, []);

  // Wywoływane za każdym razem, gdy zmienia się wybrana kamera, lub gdy załadowano listę kamer
  useEffect(() => {
    startScanner();

    return stopScanner;
  }, [selectedCamera, videoDevices]);

  // Wywoływane przy zmianie wybranej kamery
  useEffect(() => {
    localStorage.setItem("selectedCamera", String(selectedCamera));
  }, [selectedCamera]);

  return (
    <div className="vh-100 overflow-hidden bg-dark">
      
      {/* Podgląd kamery */}
      <video
        key={selectedCamera}
        ref={videoRef}
        muted
        playsInline
      />

      <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
        <img src="/src/assets/qr_lens.svg" className="qr-lens opacity-50"/>
      </div>

      {/* Nagłówek skanera kodów kreskowych */}
      <div className="barcode-scanner-header fixed-top container-fluid d-flex">
        <div className="d-flex align-items-center" onClick={() => navigate(-1)}>
          <ChevronLeft className="me-3" color={"white"} size={"28"}/>
          <h1 className="mb-0 text-white">Powrót</h1>
        </div>
      </div>

      {/* Przycisk zmiany kamery */}
      <div className={`position-absolute bottom-0 end-0 m-3 d-flex flex-row align-items-center gap-2`+(isDoneSwitching ? "" : " opacity-50")}>
        <h1 className="text-white mb-0">{selectedCamera+1}</h1>
        <ArrowRepeat color={"white"} size={"48"} onClick={() => {  
          if(!isDoneSwitching) return; 
          if(videoDevices.length != 1) setIsDoneSwitching(false);
          setSelectedCamera((prev) =>
            (prev + 1) % videoDevices.length
          );
        }} />
      </div>

      {/* Przycisk wysyłający zapytanie o ustalony produkt - na potrzeby developmentu */}
      <div className="position-absolute bottom-0 start-0 m-3">
        <Hammer color={"white"} size={"48"} onClick={() => {
          setIsOverlayVisible(true);
          fetchProductInfo(DEBUG_BARCODE).then((value) => setResult(value));
        }} />
      </div>

      {/* Instrukcje skanera */}
      <div className="position-absolute top-50 start-0 text-center text-white p-3 d-flex align-items-center justify-content-center">
        <p>Skieruj kamerę na kod kreskowy lub kod QR, a my postaramy się znaleźć informacje o produkcie!</p>
      </div>

      {/* Overlay skanera */}
      <div className={ (isOverlayVisible ? "" : "d-none ") + "bg-black bg-opacity-50 position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" }>
        
        {/* Komunikat o szukaniu informacji */}
        <div className={`${!result ? "" : "d-none "}position-absolute top-50 start-50 translate-middle text-center bg-light p-4 rounded max-width-90 max-height-90`}>
          <p className="text-dark">Szukam informacji o produkcie...</p>
        </div>

        {/* Komunikat o znalezionym produkcie */}
        <div className={`${result ? "" : "d-none "}position-absolute top-50 start-50 translate-middle text-center bg-light p-4 rounded max-width-90 max-height-90`}>
          <h3>Znaleziono:</h3>
          <img src={result?.product?.image_url ? result.product.image_url : "null"} alt="Product" className="img-fluid product-preview"/>
          <p>
          {
            result?.product?.name == null ? "" : result?.product?.brand + " " + result?.product?.name
          }</p>
          <Button variant="primary" className="border-2 fw-semibold py-2 px-5 my-1" onClick={() => {
            let productName;
            if(result?.product?.name == null) productName = "";
            else productName = result.product.name;
            navigate(`/containers/${containerId}/add-product`, {
              state: {
                name: result?.product?.brand + " " + productName,
                unit: result?.product?.unit,
                capacity: result?.product?.capacity
              }
            })
          }}>Wczytaj</Button>
          <Button variant="outline-dark" className="border-2 fw-semibold py-2 px-5 my-1" onClick={() => {
            setIsOverlayVisible(false);
            setResult(null);
          }}>Zamknij</Button>
        </div>

        {/* Komunikat o nieznalezionym produkcie */}
        <div className={`${result?.status == 0 ? "" : "d-none "}position-absolute top-50 start-50 translate-middle text-center bg-light p-4 rounded  max-width-90 max-height-90`}>
          <h3>Przykro nam :(</h3>
          <p>Niestety nie udało nam się znaleźć informacji o tym produkcie.</p>
          <Button variant="outline-dark" className="border-2 fw-semibold py-2" onClick={() => {
            setIsOverlayVisible(false);
            setResult(null);
          }}>Zamknij</Button>
        </div>

      </div>
    </div>
  );
};

export default ProductBarcodeScanner;
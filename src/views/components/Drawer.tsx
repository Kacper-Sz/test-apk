/*
Komponent Drawer jest zależny od parametru `open`, który określa, czy Drawer jest widoczny czy nie.
Parametr `open` jest częścią stanu komponentu nadrzędnego, który jest przekazywany jako Prop.
*/
import { useNavigate } from 'react-router';
import { PersonCircle, Archive, BoxArrowRight } from 'react-bootstrap-icons';
import { removeUser } from '../../Storage';


type DrawerProps = {open: boolean, setOpen: (v: boolean) => void};
const Drawer : React.FC<DrawerProps> = ({open, setOpen}: DrawerProps) => {
    const navigate = useNavigate();
    let overlay;
    let drawer;

    if(open){
        overlay = <div className="drawer-overlay" onClick={() => setOpen(false)}/>;
    }
    else{
        overlay = (<></>);
    }

    drawer = (<>
        <div className={`drawer${open ? ' drawer-open' : ''}`}>
            <div className="drawer-header border-bottom">
                <span className="fw-bold fs-5">Menu</span>
                <button
                    className="btn-close"
                    onClick={() => setOpen(false)}
                    aria-label="Zamknij"
                />
            </div>

            <div className="drawer-body d-flex flex-column gap-1">
                <button
                    className="btn btn-light text-start d-flex align-items-center gap-2 px-3 py-2"
                    onClick={() => { navigate('/profile'); setOpen(false); }}
                >
                    <PersonCircle size={20} />
                    Profil
                </button>

                <button
                    className="btn btn-light text-start d-flex align-items-center gap-2 px-3 py-2"
                    onClick={() => { navigate('/containers'); setOpen(false); }}
                >
                    <Archive size={20} />
                    Kontenery
                </button>

                <button
                    className="btn btn-light text-danger text-start d-flex align-items-center gap-2 px-3 py-2"
                    onClick={() => { removeUser(); navigate('/login'); setOpen(false); }}
                >
                    <BoxArrowRight size={20} />
                    Wyloguj
                </button>
            </div>
        </div>
    </>);

    return (<>{overlay}{drawer}</>);
}

export default Drawer;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { CameraFill, PencilFill, Stars, Search, PersonCircle, PlusCircle } from 'react-bootstrap-icons';
//import 'bootstrap/dist/css/bootstrap.min.css';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { getUser, getStoredFriends, getStoredContainers, saveContainers, saveFriends } from '../Storage';
import { apiFetch } from '../api';
import type { FriendModel, GroupMember, Role } from './types/models';
import { ROLES } from './types/models';

const AVATAR_COLORS = ['#64b5f6', '#ffb74d', '#81c784', '#b39ddb', '#f06292'];
const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

// TODO 
// mozna przemyslec zeby zamiast np czerwonego byl domyslny kartonowy - ten co docelowo ma byc w aplikacji
const STRIP_COLORS: { label: string; value: string; hex: string }[] = [
    { label: 'Czerwony',    value: 'Red',    hex: '#e74c3c' },
    { label: 'Niebieski',   value: 'Blue',   hex: '#3498db' },
    { label: 'Zielony',     value: 'Green',  hex: '#2ecc71' },
    { label: 'Żółty',       value: 'Yellow', hex: '#f1c40f' },
    { label: 'Pomarańczowy',value: 'Orange', hex: '#e67e22' },
    { label: 'Fioletowy',   value: 'Purple', hex: '#9b59b6' },
    { label: 'Biały',       value: 'White',  hex: '#f0f0f0' },
    { label: 'Szary',       value: 'Gray',   hex: '#95a5a6' },
];

const EditContainer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const currentUser = getUser();


    const [drawerOpen, setDrawerOpen] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');
    const [stripColor, setStripColor] = useState<string>('Blue');
    const [members, setMembers] = useState<GroupMember[]>([]);

    const [searchInput, setSearchInput] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<Role>('viewer');
    const [suggestions, setSuggestions] = useState<FriendModel[]>([]);
    const [allFriends, setAllFriends] = useState<FriendModel[]>(() => getStoredFriends());
    const [selectedFriend, setSelectedFriend] = useState<FriendModel | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const refreshFriends = async () => {
        const friendIds: string[] = currentUser?.friends ?? [];
        if (friendIds.length === 0) return;
        try {
            const res = await apiFetch('/api/users/users', {
                method: 'POST',
                body: JSON.stringify({ usersId: friendIds }),
            });
            const data = await res.json();
            if (data.status === 0 && Array.isArray(data.users)) {
                saveFriends(data.users);
                setAllFriends(data.users);
            }
        } catch (err) {
            console.warn('Nie udało się odświeżyć znajomych:', err);
        }
    };

    useEffect(() => {
        refreshFriends();
    }, []);

    const isFormValid = name.trim().length > 0;

    // Wypełnij formularz danymi kontenera
    useEffect(() => {
        const containers = getStoredContainers();
        const container = containers.find(c => c.id === id);
        if (!container) {
            setNotFound(true);
            return;
        }
        setName(container.containerName || '');
        setDescription(container.description || '');
        setTags(container.tags || []);
        setIsGroup(container.isForMoreUsers || false);
        setStripColor(container.containerStripColor?.name || 'Blue');
    
        const friends = getStoredFriends();
        const initialMembers: GroupMember[] = (container.userList ?? [])
            .filter((uid: string) => uid !== currentUser?.id)
            .map((uid: string) => {
                const friend = friends.find(f => f.id === uid);
                return friend ? { friend, role: 'viewer' as Role } : null;
            })
            .filter(Boolean) as GroupMember[];
        
        setMembers(initialMembers);
    }, [id]);

    useEffect(() => {
        if (!searchInput.trim() || selectedFriend) {
            setSuggestions([]);
            return;
        }
        const q = searchInput.toLowerCase();
        const alreadyAdded = members.map(m => m.friend.id);
        setSuggestions(
            allFriends.filter(f =>
                !alreadyAdded.includes(f.id) &&
                (f.login.toLowerCase().includes(q) ||
                    f.email.toLowerCase().includes(q) ||
                    f.firstName.toLowerCase().includes(q) ||
                    f.lastName.toLowerCase().includes(q))
            )
        );
    }, [searchInput, members, allFriends, selectedFriend]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelectSuggestion = (friend: FriendModel) => {
        setSelectedFriend(friend);
        setSearchInput(`${friend.firstName} ${friend.lastName} (${friend.login})`);
        setSuggestions([]);
    };

    const handleConfirmAdd = () => {
        if (!selectedFriend) return;
        setMembers(prev => [...prev, { friend: selectedFriend, role: newMemberRole }]);
        setSelectedFriend(null);
        setSearchInput('');
        setNewMemberRole('viewer');
    };

    const handleRoleChange = (index: number, role: Role) => {
        setMembers(prev => prev.map((m, i) => i === index ? { ...m, role } : m));
    };

    const handleRemoveMember = (index: number) => {
        setMembers(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().replace(/,$/, '');
            if (newTag && !tags.includes(newTag)) {
                setTags(prev => [...prev, newTag]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleSubmit = async () => {
        if (!id) return;
        const container = getStoredContainers().find(c => c.id === id);
        setLoading(true);

        try {
            const res = await apiFetch(`/api/Containers/updatedata/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    newContainerName: name,
                    newDescription: description,
                    newTags: tags,
                    newProductList: container?.productList ?? null,
                    newIsForMoreUsers: isGroup,
                    newUserList: isGroup ? members.map(m => m.friend.id) : null,
                    newContainerStripColor: stripColor,
                }),
            });

            const data = await res.json();

            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            // storage
            const allContainers = getStoredContainers();
            const updated = allContainers.map(c =>
                c.id === id ? { ...c, ...data.container } : c
            );
            saveContainers(updated);

            navigate('/containers');
        } catch {
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    if (notFound) {
        return (
            <Container className="py-4">
                <Alert variant="danger">Nie znaleziono kontenera.</Alert>
                <Button variant="outline-dark" onClick={() => navigate('/containers')}>
                    Wróć do listy
                </Button>
            </Container>
        );
    }

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Edytuj kontener"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            <Container className="py-4">

                {/* Zdjęcie / ikona */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="position-relative mx-auto" style={{ width: 160, height: 160 }}>
                            <div
                                className="w-100 h-100 rounded d-flex align-items-center justify-content-center bg-secondary-subtle"
                                style={{ border: '2px dashed #ccc' }}
                            >
                                <span className="text-center text-muted small">
                                    Tutaj<br />zdjęcie/<br />ikonka
                                </span>
                            </div>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, left: -8 }}
                                onClick={() => console.log('TODO: aparat')}
                            >
                                <CameraFill size={16} />
                            </button>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, right: -8 }}
                                onClick={() => console.log('TODO: galeria/edytuj')}
                            >
                                <PencilFill size={16} />
                            </button>
                        </div>
                    </Card.Body>
                </Card>

                {/* Nazwa */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <Form.Control
                            type="text"
                            placeholder="Nazwa kontenera"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="border-2 border-dark py-2"
                        />
                    </Card.Body>
                </Card>

                {/* Kolor paska */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <p className="small fw-semibold text-uppercase text-muted mb-2">Kolor kontenera</p>
                        <div className="d-flex flex-wrap gap-2">
                            {STRIP_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => setStripColor(color.value)}
                                    title={color.label}
                                    className="border-0 rounded-circle p-0"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        background: color.hex,
                                        outline: stripColor === color.value ? '3px solid #212529' : '2px solid #ccc',
                                        outlineOffset: 2,
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                        <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                            Wybrany: {STRIP_COLORS.find(c => c.value === stripColor)?.label ?? stripColor}
                        </div>
                    </Card.Body>
                </Card>

                {/* Tagi */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fw-semibold text-nowrap">Tagi:</span>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder='Np. "Napój"'
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="border-2 border-dark py-2"
                                />
                                <Button variant="outline-dark" className="border-2 d-flex align-items-center">
                                    <Search size={16} />
                                </Button>
                            </InputGroup>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI tagi')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="badge bg-secondary fw-normal d-flex align-items-center gap-1"
                                        style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        × {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                            Wpisz tag i naciśnij Enter lub przecinek
                        </div>
                    </Card.Body>
                </Card>

                {/* Dla mnie / Grupa */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex mb-3" style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #212529' }}>
                            <button
                                className={`flex-grow-1 py-2 fw-semibold border-0 ${!isGroup ? 'bg-dark text-white' : 'bg-white text-dark'}`}
                                onClick={() => setIsGroup(false)}
                            >
                                Dla mnie
                            </button>
                            <button
                                className={`flex-grow-1 py-2 fw-semibold border-0 ${isGroup ? 'bg-dark text-white' : 'bg-white text-dark'}`}
                                onClick={() => setIsGroup(true)}
                            >
                                Grupa
                            </button>
                        </div>

                        {isGroup && (
                            <div className="d-flex flex-column gap-2">
                                {/* Ty jako owner */}
                                <div className="d-flex align-items-center gap-2">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ width: 36, height: 36, background: '#64b5f6' }}
                                    >
                                        <PersonCircle size={22} color="white" />
                                    </div>
                                    <span className="flex-grow-1 small text-truncate">
                                        {currentUser?.email || 'ty'}
                                    </span>
                                    <span className="badge bg-dark fw-normal px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                        owner
                                    </span>
                                </div>

                                {/* Dodani członkowie */}
                                {members.map((member, index) => (
                                    <div key={member.friend.id} className="d-flex align-items-center gap-2">
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                            style={{ width: 36, height: 36, background: getAvatarColor(index + 1) }}
                                        >
                                            <PersonCircle size={22} color="white" />
                                        </div>
                                        <span className="flex-grow-1 small text-truncate">
                                            {member.friend.firstName} {member.friend.lastName}
                                            <span className="text-muted ms-1">({member.friend.login})</span>
                                        </span>
                                        <Form.Select
                                            size="sm"
                                            value={member.role}
                                            onChange={e => handleRoleChange(index, e.target.value as Role)}
                                            className="border-2 border-dark"
                                            style={{ maxWidth: 100 }}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </Form.Select>
                                        <button
                                            className="btn btn-link text-danger p-0 ms-1"
                                            style={{ fontSize: '1.1rem', lineHeight: 1 }}
                                            onClick={() => handleRemoveMember(index)}
                                            aria-label="Usuń"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {/* Wiersz dodawania */}
                                <div className="d-flex align-items-center gap-2" ref={searchRef}>
                                    <button
                                        className="btn btn-link p-0 text-body flex-shrink-0"
                                        onClick={handleConfirmAdd}
                                        disabled={!selectedFriend}
                                        aria-label="Dodaj użytkownika"
                                        style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <PlusCircle size={28} />
                                    </button>
                                    <div className="flex-grow-1 position-relative">
                                        <Form.Control
                                            type="text"
                                            placeholder="Szukaj znajomego..."
                                            value={searchInput}
                                            onChange={e => {
                                                setSearchInput(e.target.value);
                                                setSelectedFriend(null);
                                            }}
                                            className="border-2 border-dark py-1"
                                            size="sm"
                                        />
                                        {suggestions.length > 0 && (
                                            <div
                                                className="position-absolute bg-white border border-dark rounded shadow-sm w-100"
                                                style={{ top: '100%', left: 0, zIndex: 100 }}
                                            >
                                                {suggestions.map(f => (
                                                    <div
                                                        key={f.id}
                                                        className="px-3 py-2 small"
                                                        style={{ cursor: 'pointer' }}
                                                        onMouseDown={() => handleSelectSuggestion(f)}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                                    >
                                                        <span className="fw-semibold">{f.firstName} {f.lastName}</span>
                                                        <span className="text-muted ms-2">{f.login}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Form.Select
                                        size="sm"
                                        value={newMemberRole}
                                        onChange={e => setNewMemberRole(e.target.value as Role)}
                                        className="border-2 border-dark"
                                        style={{ maxWidth: 100 }}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </Form.Select>
                                </div>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Opis */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Opis kontenera..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="border-2 border-dark py-2"
                        />
                    </Card.Body>
                </Card>

                {error && (
                    <Alert variant="danger" className="mb-3" style={{ fontSize: '0.85rem' }}>
                        {error}
                    </Alert>
                )}

                {/* Przyciski */}
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                        onClick={() => navigate('/containers')}
                    >
                        Anuluj
                    </Button>
                    <Button
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                        disabled={!isFormValid || loading}
                        onClick={handleSubmit}
                    >
                        {loading ? 'Zapisywanie...' : 'Zapisz'}
                    </Button>
                </div>

            </Container>
        </>
    );
};

export default EditContainer;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { PencilFill, PlusLg, PersonCircle, PlusCircle, XLg, X, LockFill } from 'react-bootstrap-icons';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { getUser, getStoredFriends, getStoredContainers, saveContainers, saveFriends } from '../Storage';
import { apiFetch } from '../api';
import type { FriendModel, GroupMember, Role } from './types/models';
import { ROLES, getUserRole, canPerformAction } from './types/models';

const AVATAR_COLORS = ['#64b5f6', '#ffb74d', '#81c784', '#b39ddb', '#f06292'];
const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

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
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');
    const [stripColor, setStripColor] = useState<string | null>('Blue');
    const [members, setMembers] = useState<GroupMember[]>([]);
    // originalMembers trzyma pełne obiekty (friend + rola) załadowane z kontenera
    const [originalMemberIds, setOriginalMemberIds] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [shouldDeleteImage, setShouldDeleteImage] = useState(false);

    // Czy bieżący użytkownik jest adminem/ownerem (może edytować dane kontenera i listę członków)
    const [isAdmin, setIsAdmin] = useState(false);
    const [ownerInfo, setOwnerInfo] = useState<{ id: string, name: string }>({ id: '', name: '' });

    const [searchInput, setSearchInput] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<Role>('Viewer');
    const [suggestions, setSuggestions] = useState<FriendModel[]>([]);
    const [allFriends, setAllFriends] = useState<FriendModel[]>(() => getStoredFriends());
    const [selectedFriend, setSelectedFriend] = useState<FriendModel | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const galleryButtonRef = React.useRef<HTMLInputElement | null>(null);

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

    // Wypełnij formularz danymi kontenera, wczytaj role z userList
    useEffect(() => {
        const initializeContainer = async () => {
            const containers = getStoredContainers();
            const container = containers.find(c => c.id === id);
            if (!container) {
                setNotFound(true);
                return;
            }

            // Sprawdź rolę bieżącego użytkownika
            const role = getUserRole(container, currentUser?.id ?? '');
            const hasAdminAccess = canPerformAction(role, 'Admin');
            setIsAdmin(hasAdminAccess);

            setName(container.containerName || '');
            setDescription(container.description || '');
            
            const safeTags = (container.tags || []).filter(t => t !== 'null' && t.trim() !== '');
            setTags(safeTags);
            setStripColor(container.containerStripColor?.name || 'Blue');
            setImageUrl(container.imageUrl || null);

            let friends = getStoredFriends();

            // Zbierz wszystkie id, które potrzebujemy znać (owner + userList), ale nie my
            const neededIds = new Set<string>();
            if (container.ownerId && container.ownerId !== currentUser?.id) {
                neededIds.add(container.ownerId);
            }
            container.userList?.forEach(entry => {
                if (entry.userId !== currentUser?.id) {
                    neededIds.add(entry.userId);
                }
            });

            // Odfiltruj te, których już nie ma w lokalnych znajomych
            const unknownIds = Array.from(neededIds).filter(
                id => !friends.some(f => f.id === id)
            );

            // Jeśli jacyś brakuje to douzupełniamy za pomocą API
            if (unknownIds.length > 0) {
                try {
                    const res = await apiFetch('/api/users/users', {
                        method: 'POST',
                        body: JSON.stringify({ usersId: unknownIds }),
                    });
                    const data = await res.json();
                    if (data.status === 0 && Array.isArray(data.users)) {
                        friends = [...friends, ...data.users];
                        // my ich nie nadpisujemy w calym storagu, no ewentualnie teź bo to prawidlowe chociaż to nie per se 'znajomi'
                    }
                } catch {
                    console.warn('Nie udało się pobrać brakujących użytkowników kontenera');
                }
            }

            let ownerName = 'Nieznany właściciel';
            if (container.ownerId === currentUser?.id) {
                ownerName = currentUser?.login ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.login}) - Ty` : (currentUser?.email || 'Ty');
            } else {
                const ownerFriend = friends.find(f => f.id === container.ownerId);
                if (ownerFriend) {
                    ownerName = `${ownerFriend.firstName} ${ownerFriend.lastName} (${ownerFriend.login})`;
                }
            }
            setOwnerInfo({ id: container.ownerId || '', name: ownerName });

            // userList teraz zawiera obiekty { userId, role } — mapujemy je na GroupMember
            const initialMembers: GroupMember[] = (container.userList ?? [])
                .map(entry => {
                    let friend = friends.find(f => f.id === entry.userId);
                    if (!friend && entry.userId === currentUser?.id) {
                         friend = {
                             id: currentUser.id,
                             login: currentUser.login || currentUser.email || 'Ty',
                             firstName: currentUser.firstName || '',
                             lastName: currentUser.lastName || '',
                             email: currentUser.email || ''
                         } as FriendModel;
                    }
                    if (!friend) return null;
                    return { friend, role: entry.role } as GroupMember;
                })
                .filter(Boolean) as GroupMember[];

            setIsGroup(container.isForMoreUsers || initialMembers.length > 0);

            setMembers(initialMembers);
            setOriginalMemberIds(
                (container.userList ?? [])
                    .map(entry => entry.userId)
            );
        };

        initializeContainer();
    }, [id]);

    useEffect(() => {
        if (!searchInput.trim() || selectedFriend) {
            setSuggestions([]);
            return;
        }
        const q = searchInput.toLowerCase();
        const alreadyAdded = members.map(m => m.friend.id);
        // Wykluczamy też ownera kontenera - nie może dostać innej roli przez UI
        const excludedIds = new Set([...alreadyAdded, ownerInfo.id].filter(Boolean));
        setSuggestions(
            allFriends.filter(f =>
                !excludedIds.has(f.id) &&
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
        setNewMemberRole('Viewer');
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

    const handleAddTagButton = () => {
        const newTag = tagInput.trim().replace(/,$/, '');
        if (newTag && !tags.includes(newTag)) {
            setTags(prev => [...prev, newTag]);
        }
        setTagInput('');
    };

    const handleSubmit = async () => {
        if (!id) return;

        setLoading(true);
        setError(null);
        setPermissionError(null);

        const formData = new FormData();
        formData.append('newContainerName', name);
        formData.append('newDescription', description);
        tags.forEach(tag => formData.append('newTags', tag));
        formData.append('newIsForMoreUsers', JSON.stringify(isGroup));
        formData.append('newContainerStripColor', stripColor ?? '');
        if (imageFile) {
            formData.append('newImage', imageFile);
        }

        try {
            // Budujemy nową listę użytkowników z rolami.
            // Wysyłamy TYLKO obecnych członków (którzy już zaaprobowali zaproszenie lub byli wcześniej w kontenerze) jako userListJson,
            // żeby API mogło zaktualizować ich role i usunąć wywalonych. Nowi (nieobecni w originalMemberIds) dostaną zaproszenie osobno.
            const allMembersWithRoles = members
                .filter(m => originalMemberIds.includes(m.friend.id) && m.friend.id !== ownerInfo.id)
                .map(m => ({ userId: m.friend.id, role: m.role }));

            formData.append(
                'newUserListJson',
                JSON.stringify(isGroup ? allMembersWithRoles : [])
            );

            const res = await apiFetch(`/api/Containers/updatedata/${id}`, {
                method: 'PUT',
                body: formData
            }, null);

            if (res.status === 403) {
                setPermissionError('Nie masz uprawnień do edycji tego kontenera.');
                return;
            }

            if (shouldDeleteImage) {
                await apiFetch(`/api/Containers/deleteimage/${id}`, { method: 'PUT' });
            }

            const data = await res.json();
            console.log('API response data:', data);

            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            // Wyślij zaproszenia tylko do nowo dodanych członków
            const newlyAddedMembers = members.filter(m => !originalMemberIds.includes(m.friend.id));

            if (isGroup && newlyAddedMembers.length > 0) {
                const failedInvites: string[] = [];

                for (const member of newlyAddedMembers) {
                    try {
                        const inviteRes = await apiFetch('/api/notifications/addcontainer', {
                            method: 'POST',
                            body: JSON.stringify({
                                userId: member.friend.id,
                                containerId: id,
                                senderId: currentUser?.id,
                                role: member.role
                            }),
                        });

                        const inviteData = await inviteRes.json();

                        if (inviteData.status !== 0) {
                            failedInvites.push(member.friend.login);
                        }
                    } catch {
                        failedInvites.push(member.friend.login);
                    }
                }

                if (failedInvites.length > 0) {
                    setError(
                        `Kontener zaktualizowany, ale nie udało się wysłać zaproszeń do: ${failedInvites.join(', ')}`
                    );
                    return;
                }
            }

            // Zapisz w storage
            const allContainers = getStoredContainers();
            const updated = allContainers.map(c =>
                c.id === id
                    ? { ...c, ...data.container, isForMoreUsers: isGroup }
                    : c
            );
            saveContainers(updated);

            navigate('/containers');
        } catch {
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file?.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) return;
        setImageUrl(URL.createObjectURL(file));
        setImageFile(file);
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

    // Edytor ma dostęp do widoku ale nie może zmieniać danych kontenera ani członków
    const isReadOnly = !isAdmin;

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Edytuj kontener"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            <Container className="py-4">

                {isReadOnly && (
                    <Alert variant="warning" className="mb-3" style={{ fontSize: '0.9rem' }}>
                        <span><LockFill className="me-1" /> Masz rolę <strong>editor</strong> lub <strong>viewer</strong> — możesz tylko przeglądać dane kontenera. Do edycji potrzebujesz wyższych uprawnień.</span>
                    </Alert>
                )}

                {permissionError && (
                    <Alert variant="danger" className="mb-3" style={{ fontSize: '0.85rem' }}>
                        <span><LockFill className="me-1" /> {permissionError}</span>
                    </Alert>
                )}

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
                                {imageUrl && (
                                    <img src={imageUrl} alt="Zdjęcie produktu"
                                    className="position-absolute w-100 h-100 object-fit-cover rounded"
                                    style={{border: '2px solid #ccc' }}/>
                                )}
                            </div>
                            {!isReadOnly && (
                                <button
                                    className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                    style={{ width: 36, height: 36, bottom: -8, right: -8 }}
                                    onClick={() => galleryButtonRef.current?.click()}
                                >
                                    <input
                                        ref={galleryButtonRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        style={{ display: "none" }}
                                    />
                                    <PencilFill size={16} />
                                </button>
                            )}
                            {!isReadOnly && (imageFile || imageUrl) && (
                                <button
                                    className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                    style={{ width: 36, height: 36, top: -8, right: -8 }}
                                    onClick={() => {
                                        setImageUrl(null);
                                        setImageFile(null);
                                        setShouldDeleteImage(true);
                                    }}
                                >
                                    <XLg size={16}/>
                                </button>
                            )}
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
                            disabled={isReadOnly}
                            maxLength={100}
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
                            <button
                                onClick={() => {setStripColor(null)}}
                                title={"None"}
                                className="border-0 rounded-circle p-0"
                                style={{
                                    width: 32,
                                    height: 32,
                                    background: 'white',
                                    outline: stripColor === null ? '3px solid #212529' : '2px solid #ccc',
                                    outlineOffset: 2,
                                    cursor: 'pointer'
                                }}>
                                    <X size={32} />
                            </button>
                        </div>
                        <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                            Wybrany: {STRIP_COLORS.find(c => c.value === stripColor)?.label ? stripColor : 'Brak'}
                        </div>
                    </Card.Body>
                </Card>

                {/* Tagi */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fw-semibold text-nowrap">Tagi:</span>
                            <InputGroup className="input-group-password-focus">
                                <Form.Control
                                    type="text"
                                    placeholder='Np. "Napój"'
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="border-2 border-dark py-2"
                                    disabled={isReadOnly || tags.length >= 20}
                                    maxLength={30}
                                />
                                <Button variant="outline-dark" className="border-2 d-flex align-items-center" disabled={isReadOnly || !tagInput.trim() || tags.length >= 20} onClick={handleAddTagButton}>
                                    <PlusLg size={16} />
                                </Button>
                            </InputGroup>
                            {/* <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI tagi')}
                                title="Generuj przez AI"
                                disabled={isReadOnly}
                            >
                                <Stars size={18} />
                            </Button> */}
                        </div>
                        {tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="badge bg-secondary fw-normal d-flex align-items-center gap-1"
                                        style={{ fontSize: '0.85rem', cursor: isReadOnly ? 'default' : 'pointer' }}
                                        onClick={() => !isReadOnly && handleRemoveTag(tag)}
                                    >
                                        {!isReadOnly && '× '}{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                            {isReadOnly ? 'Tylko podgląd tagów' : `Wpisz tag i naciśnij Enter, przecinek lub +${tags.length > 0 ? ` (${tags.length}/20)` : ''}`}
                        </div>
                    </Card.Body>
                </Card>

                {/* Dla mnie / Grupa */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex mb-3" style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #212529' }}>
                            <button
                                className={`flex-grow-1 py-2 fw-semibold border-0 ${!isGroup ? 'bg-dark text-white' : 'bg-white text-dark'}`}
                                onClick={() => { if (!isReadOnly) { setIsGroup(false); setMembers([]); } }}
                                disabled={isReadOnly}
                            >
                                Dla mnie
                            </button>
                            <button
                                className={`flex-grow-1 py-2 fw-semibold border-0 ${isGroup ? 'bg-dark text-white' : 'bg-white text-dark'}`}
                                onClick={() => !isReadOnly && setIsGroup(true)}
                                disabled={isReadOnly}
                            >
                                Grupa
                            </button>
                        </div>

                        {isGroup && (
                            <div className="d-flex flex-column gap-2">
                                {/* Właściciel kontenera */}
                                <div className="d-flex align-items-center gap-2">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden"
                                        style={{ width: 36, height: 36, background: '#64b5f6' }}
                                    >
                                        {(() => {
                                            const ownerUser = ownerInfo.id === currentUser?.id ? currentUser : allFriends.find(f => f.id === ownerInfo.id);
                                            return ownerUser?.profileUrl ? (
                                                <img
                                                    src={ownerUser.profileUrl}
                                                    alt="Profil"
                                                    style={{ width: 36, height: 36, objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <PersonCircle size={22} color="white" />
                                            );
                                        })()}
                                    </div>
                                    <span className="flex-grow-1 small text-truncate">
                                        {ownerInfo.name}
                                    </span>
                                    <span className="badge bg-dark fw-normal px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                        owner
                                    </span>
                                </div>

                                {/* Członkowie z rolami */}
                                {members.map((member, index) => (
                                    <div key={member.friend.id} className="d-flex align-items-center gap-2">
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden"
                                            style={{ width: 36, height: 36, background: getAvatarColor(index + 1) }}
                                        >
                                            {member.friend.profileUrl ? (
                                                <img
                                                    src={member.friend.profileUrl}
                                                    alt="Profil"
                                                    style={{ width: 36, height: 36, objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <PersonCircle
                                                    size={20}
                                                    className={`flex-shrink-0`}
                                                />
                                            )}
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
                                            disabled={isReadOnly}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </Form.Select>
                                        {!isReadOnly && (
                                            <button
                                                className="btn btn-link text-danger p-0 ms-1"
                                                style={{ fontSize: '1.1rem', lineHeight: 1 }}
                                                onClick={() => handleRemoveMember(index)}
                                                aria-label="Usuń"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Wiersz dodawania — tylko dla admina/ownera */}
                                {!isReadOnly && (
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
                                                maxLength={100}
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
                                )}
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
                            disabled={isReadOnly}
                            maxLength={2000}
                        />
                        {!isReadOnly && (
                            <div className="text-muted text-end mt-1" style={{ fontSize: '0.75rem' }}>
                                {description.length}/2000
                            </div>
                        )}
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
                        {isReadOnly ? 'Wróć' : 'Anuluj'}
                    </Button>
                    {!isReadOnly && (
                        <Button
                            variant="outline-dark"
                            className="flex-grow-1 border-2 fw-semibold py-2"
                            disabled={!isFormValid || loading}
                            onClick={handleSubmit}
                        >
                            {loading ? 'Zapisywanie...' : 'Zapisz'}
                        </Button>
                    )}
                </div>

            </Container>
        </>
    );
};

export default EditContainer;
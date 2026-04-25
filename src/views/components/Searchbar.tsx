import type React from "react";
import { Container, Dropdown, Form, InputGroup } from "react-bootstrap";
import { ArrowDownUp, Funnel, Search } from "react-bootstrap-icons";

type SearchBarProps = {
    placeholderText: string;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    // TODO: To są tymczasowe opcje. Docelowo opcje będą bardziej rozbudowane i zależne od ekranu.
    sortOrder: 'none' | 'asc' | 'desc';
    setSortOrder: (v: 'none' | 'asc' | 'desc') => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ placeholderText, searchTerm, setSearchTerm, sortOrder, setSortOrder }: SearchBarProps) => {
    return (
        <>
        <div
            className="bg-light sticky-top border-bottom shadow-sm"
            style={{zIndex: 1019, top: '3rem' }}
        >
            <Container>
                <div className="py-2">
                    <div className="d-flex align-items-center gap-2">
                        <InputGroup className="flex-grow-1">
                            <InputGroup.Text>
                                <Search />
                            </InputGroup.Text>
                            <Form.Control className="bg-light"
                                type="text"
                                placeholder={placeholderText}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>

                        <button
                            className="btn btn-outline-secondary"
                            title="Filtruj"
                            onClick={() => {}}
                        >
                            <Funnel size={18} />
                        </button>

                        <Dropdown align="end">
                            <Dropdown.Toggle
                                variant="outline-secondary"
                                title="Sortuj"
                                className={sortOrder !== 'none' ? 'text-primary border-secondary' : ''}
                            >
                                <ArrowDownUp size={18} />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item active={sortOrder === 'none'} onClick={() => setSortOrder('none')}>
                                    Domyślna kolejność
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item active={sortOrder === 'asc'} onClick={() => setSortOrder('asc')}>
                                    Nazwa A → Z
                                </Dropdown.Item>
                                <Dropdown.Item active={sortOrder === 'desc'} onClick={() => setSortOrder('desc')}>
                                    Nazwa Z → A
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </div>
            </Container>
            </div>
        </>
    );
};

export default SearchBar;
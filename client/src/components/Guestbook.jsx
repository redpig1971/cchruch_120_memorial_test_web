import React, { useState, useEffect, useRef } from 'react';

const Guestbook = ({ deceasedName, currentUser }) => {
    const [view, setView] = useState('list'); // 'list', 'write', 'detail'
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const titleInputRef = useRef(null);

    useEffect(() => {
        if (deceasedName) {
            fetchPosts();
        }
    }, [deceasedName, view]);

    useEffect(() => {
        if (view === 'write' && titleInputRef.current) {
            // Slight timeout to ensure render visibility if needed, or immediate
            titleInputRef.current.focus();
        }
    }, [view]);

    const fetchPosts = () => {
        fetch(`http://localhost:5000/api/guestbook?deceasedName=${encodeURIComponent(deceasedName)}`)
            .then(res => res.json())
            .then(data => setPosts(data.posts || []))
            .catch(err => console.error('Error fetching guestbook:', err));
    };

    const handleWriteSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/guestbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deceasedName,
                    author: currentUser.username,
                    title: formData.title,
                    content: formData.content
                })
            });
            if (response.ok) {
                alert('글이 등록되었습니다.');
                setFormData({ title: '', content: '' });
                setView('list');
                setCurrentPage(1); // Reset to first page on new post
                fetchPosts(); // Refresh list
            } else {
                alert('등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error writing post:', error);
            alert('오류가 발생했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        if (!window.confirm("정말 이 글을 게시판에서 삭제하시겠습니까? (삭제된 글은 복구할 수 없습니다)")) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/guestbook/${selectedPost.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('글이 삭제되었습니다.');
                setView('list');
                setSelectedPost(null);
                fetchPosts(); // Refresh list
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('오류가 발생했습니다.');
        }
    };

    const renderList = () => {
        const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
        const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
        const currentItems = posts.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>{deceasedName}님에게 남기는 편지</h3>
                    <button
                        onClick={() => setView('write')}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        글쓰기
                    </button>
                </div>
                {posts.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>아직 등록된 글이 없습니다.</p>
                ) : (
                    <>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {currentItems.map(post => (
                                <li
                                    key={post.id}
                                    onClick={() => { setSelectedPost(post); setView('detail'); }}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    className="guestbook-item"
                                >
                                    <span style={{ fontWeight: 'bold' }}>{post.title}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {post.author} | {new Date(post.created_at).toLocaleDateString()}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.3rem 0.8rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    이전
                                </button>
                                <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '0.3rem 0.8rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderWrite = () => (
        <div>
            <h3>편지 쓰기</h3>
            <form onSubmit={handleWriteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="제목"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ position: 'relative' }}>
                    <textarea
                        placeholder="내용을 입력하세요..."
                        value={formData.content}
                        onChange={e => {
                            if (e.target.value.length <= 300) {
                                setFormData({ ...formData, content: e.target.value });
                            }
                        }}
                        maxLength={300}
                        required
                        rows={10}
                        style={{
                            width: '95%',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            resize: 'vertical'
                        }}
                    />
                    <div style={{
                        textAlign: 'right',
                        fontSize: '0.8rem',
                        color: formData.content.length >= 300 ? '#ef4444' : '#64748b',
                        marginTop: '0.25rem'
                    }}>
                        {formData.content.length} / 300자
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#94a3b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        등록
                    </button>
                </div>
            </form>
        </div>
    );

    const renderDetail = () => (
        <div>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{selectedPost.title}</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>작성자: {selectedPost.author}</span>
                    <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                </div>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', minHeight: '200px', marginBottom: '1rem' }}>
                {selectedPost.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                    onClick={() => setView('list')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    목록으로
                </button>
                <button
                    onClick={handleDelete}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    삭제하기
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginTop: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            {view === 'list' && renderList()}
            {view === 'write' && renderWrite()}
            {view === 'detail' && selectedPost && renderDetail()}
        </div>
    );
};

export default Guestbook;

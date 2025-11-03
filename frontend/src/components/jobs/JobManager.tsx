import React, { useRef, useState } from 'react';
import { Table, Input, Button, Space, Row, Col, Tag, Select } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { InputRef } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';

type Job = {
    id: number;
    title: string;
    department: string;
    location: string;
    salary: number;
    postedDate: string; // ISO or YYYY-MM-DD
    status: 'Open' | 'Closed' | 'Paused';
};

// Generate some fake data
const fakeData: Job[] = Array.from({ length: 25 }).map((_, idx) => {
    const statuses: Job['status'][] = ['Open', 'Closed', 'Paused'];
    const depts = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance'];
    const locations = ['Hanoi', 'Ho Chi Minh', 'Da Nang', 'Remote'];
    const today = new Date();
    const posted = new Date(today.getTime() - Math.floor(Math.random() * 60) * 24 * 3600 * 1000);
    return {
        id: idx + 1,
        title: `Job Title ${idx + 1}`,
        department: depts[idx % depts.length],
        location: locations[idx % locations.length],
        salary: 800 + (idx % 10) * 100,
        postedDate: posted.toISOString().slice(0, 10),
        status: statuses[idx % statuses.length],
    };
});

// Small helper to escape regex and highlight matches
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text: string, term: string) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => (
                part.toLowerCase() === term.toLowerCase() ? (
                    <mark key={i} style={{ background: '#ffc069', padding: 0 }}>{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            ))}
        </span>
    );
};

// Helper for column search (based on Ant Design examples)
const getColumnSearchProps = (
    dataIndex: keyof Job,
    searchInputRef: React.RefObject<InputRef>,
    searchText: string,
    setSearchText: (val: string) => void,
    searchedColumn: string | null,
    setSearchedColumn: (val: string | null) => void,
) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
            <Input
                ref={searchInputRef}
                placeholder={`Tìm ${String(dataIndex)}`}
                value={selectedKeys[0]}
                onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                onPressEnter={() => { confirm(); setSearchText(selectedKeys[0] || ''); setSearchedColumn(String(dataIndex)); }}
                style={{ marginBottom: 8, display: 'block' }}
            />
            <Space>
                <Button
                    type="primary"
                    onClick={() => { confirm(); setSearchText(selectedKeys[0] || ''); setSearchedColumn(String(dataIndex)); }}
                    icon={<SearchOutlined />}
                    size="small"
                    style={{ width: 90 }}
                >
                    Tìm
                </Button>
                <Button onClick={() => { clearFilters(); setSearchText(''); }} size="small" style={{ width: 90 }}>
                    Xóa
                </Button>
            </Space>
        </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value: string, record: Job) => {
        const recordValue = String(record[dataIndex] ?? '').toLowerCase();
        return recordValue.indexOf(String(value).toLowerCase()) >= 0;
    },
    render: (text: any) => {
        const txt = text ? String(text) : '';
        return (searchedColumn === String(dataIndex) && searchText) ? highlightText(txt, searchText) : txt;
    },
});

const JobManager: React.FC = () => {
    const [data] = useState<Job[]>(fakeData);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState<string | null>(null);
    const searchInput = useRef<InputRef>(null);

    const columns: ColumnsType<Job> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: (a, b) => a.id - b.id,
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            ...getColumnSearchProps('title', searchInput, searchText, setSearchText, searchedColumn, setSearchedColumn) as ColumnType<Job>,
            sorter: (a, b) => a.title.localeCompare(b.title),
            ellipsis: true,
            responsive: ['xs', 'sm', 'md', 'lg'],
        },
        {
            title: 'Phòng ban',
            dataIndex: 'department',
            key: 'department',
            ...getColumnSearchProps('department', searchInput, searchText, setSearchText, searchedColumn, setSearchedColumn) as ColumnType<Job>,
            filters: Array.from(new Set(data.map(d => d.department))).map(d => ({ text: d, value: d })),
            onFilter: (value, record) => record.department === value,
            sorter: (a, b) => a.department.localeCompare(b.department),
        },
        {
            title: 'Địa điểm',
            dataIndex: 'location',
            key: 'location',
            ...getColumnSearchProps('location', searchInput, searchText, setSearchText, searchedColumn, setSearchedColumn) as ColumnType<Job>,
            sorter: (a, b) => a.location.localeCompare(b.location),
            responsive: ['sm', 'md', 'lg'],
        },
        {
            title: 'Mức lương',
            dataIndex: 'salary',
            key: 'salary',
            sorter: (a, b) => a.salary - b.salary,
            render: (val: number) => `${val.toLocaleString()} $`,
            responsive: ['md', 'lg'],
        },
        {
            title: 'Ngày đăng',
            dataIndex: 'postedDate',
            key: 'postedDate',
            sorter: (a, b) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime(),
            responsive: ['sm', 'md', 'lg'],
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            filters: Array.from(new Set(data.map(d => d.status))).map(s => ({ text: s, value: s })),
            onFilter: (value, record) => record.status === value,
            render: (status: Job['status']) => {
                const color = status === 'Open' ? 'green' : status === 'Closed' ? 'volcano' : 'gold';
                return <Tag color={color}>{status}</Tag>;
            },
            responsive: ['xs', 'sm', 'md'],
        },
    ];

    return (
        <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={24} md={12} lg={16}>
                    <Button icon={<PlusOutlined />} type="primary">Tạo công việc</Button>
                </Col>
            </Row>

            <Table<Job>
                columns={columns}
                dataSource={data}
                rowKey={(record) => record.id}
                pagination={{ pageSize: 8 }}
                bordered
                scroll={{ x: 900 }}
            />
        </div>
    );
};

export default JobManager;


'use client';

import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Steps, 
  Button, 
  message, 
  Alert,
  Card,
  Tag,
  Table,
  Space,
  Spin,
  Divider,
  InputNumber,
  Select,
  Tooltip
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BulbOutlined,
  StarOutlined
} from '@ant-design/icons';
import { ProjectMember } from '@/types/project';
import jobService from '@/service/jobService';

const { TextArea } = Input;
const { Step } = Steps;

interface TaskCreateWithAIProps {
  visible: boolean;
  projectId: string;
  members: ProjectMember[];
  onCancel: () => void;
  onSuccess: () => void;
}

interface AIAnalysisResult {
  difficulty_level: number;
  estimated_hours: number;
  summary: string;
  recommendations: string[];
  required_skills: Array<{
    skill_id: number;
    skill_name: string;
    required_level: string;
    importance: string;
  }>;
}

interface CandidateMatch {
  user_id: number;
  fullName?: string;
  email?: string;
  match_score: number;
  overall_assessment: string;
  matched_skills: Array<{
    skill_id: number;
    skill_name: string;
    required_level: string;
    user_level: string;
    is_match: boolean;
  }>;
  missing_skills: Array<{
    skill_id: number;
    skill_name: string;
    required_level: string;
  }>;
  skill_match_count: number;
  total_required_skills: number;
  current_workload_hours?: number | null;
  can_take_more_work?: boolean;
  workload_assessment?: string;
  risk_level?: 'low' | 'medium' | 'high';
}

interface CandidatesResponse {
  suggested_candidates: CandidateMatch[];
  all_project_members: CandidateMatch[];
  total_suggested: number;
  total_members: number;
}

const difficultyColors = ['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f'];
const difficultyLabels = ['Rất dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó'];

const levelColors: { [key: string]: string } = {
  A: 'red',
  B: 'orange',
  C: 'gold',
  D: 'blue',
  E: 'green'
};

const levelLabels: { [key: string]: string } = {
  A: 'Expert (5+ years)',
  B: 'Senior (3-5 years)',
  C: 'Intermediate (1-3 years)',
  D: 'Junior (<1 year)',
  E: 'Beginner'
};

const importanceColors: { [key: string]: string } = {
  required: 'red',
  preferred: 'orange',
  'nice-to-have': 'blue'
};

const TaskCreateWithAI: React.FC<TaskCreateWithAIProps> = ({
  visible,
  projectId,
  members,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Input
  const [taskInput, setTaskInput] = useState({ title: '', description: '' });
  
  // Step 2: AI Analysis Result
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [editableSkills, setEditableSkills] = useState<AIAnalysisResult['required_skills']>([]);
  
  // Step 3: Candidates
  const [suggestedCandidates, setSuggestedCandidates] = useState<CandidateMatch[]>([]);
  const [allProjectMembers, setAllProjectMembers] = useState<CandidateMatch[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  const handleReset = () => {
    setCurrentStep(0);
    setTaskInput({ title: '', description: '' });
    setAiAnalysis(null);
    setEditableSkills([]);
    setSuggestedCandidates([]);
    setAllProjectMembers([]);
    setSelectedCandidate(null);
    form.resetFields();
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  // Step 1: Analyze with AI
  const handleAnalyze = async () => {
    try {
      await form.validateFields(['title', 'description']);
      const values = form.getFieldsValue();
      
      setLoading(true);
      message.loading({ content: 'AI đang phân tích công việc...', key: 'analyze', duration: 0 });

      const response = await jobService.analyzeJob({
        title: values.title,
        description: values.description,
        project_id: projectId
      });

      if (response.data.success) {
        const analysis = response.data.analysis;
        setAiAnalysis(analysis);
        setEditableSkills(analysis.required_skills || []);
        setTaskInput({ title: values.title, description: values.description });
        message.success({ content: 'Phân tích thành công!', key: 'analyze' });
        setCurrentStep(1);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error: any) {
      message.error({
        content: `Lỗi phân tích: ${error.response?.data?.details || error.message}`,
        key: 'analyze'
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Find Candidates
  const handleFindCandidates = async () => {
    try {
      if (!aiAnalysis || editableSkills.length === 0) {
        message.warning('Cần có ít nhất 1 kỹ năng yêu cầu');
        return;
      }

      setLoading(true);
      message.loading({ content: 'Đang tìm ứng viên phù hợp...', key: 'find', duration: 0 });

      const response = await jobService.findCandidates({
        project_id: projectId,
        job_title: taskInput.title,
        job_estimated_hours: aiAnalysis?.estimated_hours || 0,
        required_skills: editableSkills.map((skill: any) => ({
          skill_id: skill.skill_id,
          proficiency_level: skill.required_level,
          importance: skill.importance
        })),
        min_match_score: 0,
        max_results: 1000,
        check_workload: true
      });

      if (response.data.success) {
        const data: CandidatesResponse = response.data;
        setSuggestedCandidates(data.suggested_candidates || []);
        setAllProjectMembers(data.all_project_members || []);
        
        message.success({
          content: `Tìm thấy ${data.total_suggested} người được đề xuất và ${data.total_members} thành viên trong dự án!`,
          key: 'find'
        });
        
        setCurrentStep(2);
      } else {
        throw new Error('Finding candidates failed');
      }
    } catch (error: any) {
      message.error({
        content: `Lỗi tìm ứng viên: ${error.response?.data?.details || error.message}`,
        key: 'find'
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create Task
  const handleCreateTask = async () => {
    try {
      if (!selectedCandidate) {
        message.warning('Vui lòng chọn ứng viên');
        return;
      }

      setLoading(true);
      message.loading({ content: 'Đang tạo công việc...', key: 'create', duration: 0 });

      const response = await jobService.createJobWithAnalysis({
        title: taskInput.title,
        description: taskInput.description,
        project_id: projectId,
        status: 'todo',
        assigned_to_user_id: selectedCandidate,
        difficulty_level: aiAnalysis?.difficulty_level,
        estimated_hours: aiAnalysis?.estimated_hours,
        ai_analysis_result: JSON.stringify(aiAnalysis),
        required_skills: editableSkills.map((skill: any) => ({
          skill_id: skill.skill_id,
          proficiency_level: skill.required_level
        }))
      });

      if (response.data.success) {
        message.success({ content: 'Tạo công việc thành công!', key: 'create' });
        handleReset();
        onSuccess();
      } else {
        throw new Error('Create job failed');
      }
    } catch (error: any) {
      message.error({
        content: `Lỗi tạo công việc: ${error.response?.data?.details || error.message}`,
        key: 'create'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update skill in editable list
  const handleSkillEdit = (index: number, field: string, value: any) => {
    const newSkills = [...editableSkills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setEditableSkills(newSkills);
    
    // Clear candidates to force re-search when user edits skills
    setSuggestedCandidates([]);
    setAllProjectMembers([]);
    // Reset to step 1 (skill editing) if user was viewing candidates
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  // Render Step 1: Input
  const renderStepInput = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="title"
        label="Tiêu đề công việc"
        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
      >
        <Input placeholder="VD: Xây dựng API authentication với JWT" size="large" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Mô tả chi tiết"
        rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
      >
        <TextArea
          rows={8}
          placeholder="Mô tả chi tiết về công việc, yêu cầu, deliverables..."
          showCount
          maxLength={2000}
        />
      </Form.Item>

      <Alert
        message="AI sẽ phân tích công việc và đề xuất:"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>Mức độ khó (1-5)</li>
            <li>Thời gian ước tính (giờ)</li>
            <li>Kỹ năng cần thiết (A-E level)</li>
            <li>Khuyến nghị thực hiện</li>
          </ul>
        }
        type="info"
        icon={<RobotOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Button
        type="primary"
        icon={<RobotOutlined />}
        onClick={handleAnalyze}
        loading={loading}
        size="large"
        block
      >
        Phân tích với AI
      </Button>
    </Form>
  );

  // Render Step 2: AI Analysis
  const renderStepAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <div>
        {/* Summary */}
        <Card title="Phân tích tổng quan" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <strong>Mức độ khó:</strong>{' '}
              <Tag color={difficultyColors[aiAnalysis.difficulty_level - 1]}>
                {aiAnalysis.difficulty_level}/5 - {difficultyLabels[aiAnalysis.difficulty_level - 1]}
              </Tag>
            </div>
            
            <div>
              <strong>Thời gian ước tính:</strong>{' '}
              <Tag color="blue">{aiAnalysis.estimated_hours} giờ</Tag>
            </div>

            <div>
              <strong>Nhận xét:</strong>
              <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {aiAnalysis.summary}
              </div>
            </div>

            {aiAnalysis.recommendations.length > 0 && (
              <div>
                <strong>Khuyến nghị:</strong>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {aiAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </Space>
        </Card>

        {/* Skills Required */}
        <Card title="Kỹ năng yêu cầu" extra={<Tag>{editableSkills.length} kỹ năng</Tag>}>
          <Table
            dataSource={editableSkills}
            rowKey={(record) => `${record.skill_id}`}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Kỹ năng',
                dataIndex: 'skill_name',
                key: 'skill_name',
                width: '35%'
              },
              {
                title: 'Level',
                dataIndex: 'required_level',
                key: 'required_level',
                width: '25%',
                render: (level, record, index) => (
                  <Select
                    value={level}
                    style={{ width: '100%' }}
                    onChange={(value) => handleSkillEdit(index, 'required_level', value)}
                  >
                    {Object.entries(levelLabels).map(([key, label]) => (
                      <Select.Option key={key} value={key}>
                        <Tag color={levelColors[key]}>{key}</Tag> {label}
                      </Select.Option>
                    ))}
                  </Select>
                )
              },
              {
                title: 'Quan trọng',
                dataIndex: 'importance',
                key: 'importance',
                width: '25%',
                render: (importance, record, index) => (
                  <Select
                    value={importance}
                    style={{ width: '100%' }}
                    onChange={(value) => handleSkillEdit(index, 'importance', value)}
                  >
                    <Select.Option value="required">
                      <Tag color="red">Bắt buộc</Tag>
                    </Select.Option>
                    <Select.Option value="preferred">
                      <Tag color="orange">Ưu tiên</Tag>
                    </Select.Option>
                    <Select.Option value="nice-to-have">
                      <Tag color="blue">Tốt nếu có</Tag>
                    </Select.Option>
                  </Select>
                )
              },
              {
                title: '',
                key: 'action',
                width: '15%',
                render: (_, record, index) => (
                  <Button
                    danger
                    size="small"
                    onClick={() => {
                      const newSkills = editableSkills.filter((_, i) => i !== index);
                      setEditableSkills(newSkills);
                      // Clear candidates when removing skill
                      setSuggestedCandidates([]);
                      setAllProjectMembers([]);
                      if (currentStep === 2) {
                        setCurrentStep(1);
                      }
                    }}
                  >
                    Xóa
                  </Button>
                )
              }
            ]}
          />

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
            <Button
              type="primary"
              icon={<UserOutlined />}
              onClick={handleFindCandidates}
              loading={loading}
            >
              Tìm nhân viên phù hợp
            </Button>
          </Space>
        </Card>
      </div>
    );
  };

  // Render Step 3: Candidates (2 sections: Suggested + All Members)
  const renderStepCandidates = () => {
    const candidateColumns = [
      {
        title: 'Người dùng',
        key: 'fullName',
        width: '20%',
        render: (record: CandidateMatch) => (
          <div>
            <div><strong>{record.fullName || `User ${record.user_id}`}</strong></div>
            {record.email && <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>}
          </div>
        )
      },
      {
        title: 'Match Score',
        dataIndex: 'match_score',
        key: 'match_score',
        render: (score: number) => (
          <Tag color={score >= 75 ? 'green' : score >= 50 ? 'orange' : score > 0 ? 'red' : 'default'}>
            {score}%
          </Tag>
        ),
        sorter: (a: any, b: any) => b.match_score - a.match_score,
        defaultSortOrder: 'descend' as const
      },
      {
        title: 'Workload',
        key: 'workload',
        render: (record: CandidateMatch) => {
          if (record.current_workload_hours == null) {
            return <Tag>N/A</Tag>;
          }
          const riskColor = record.risk_level === 'low' ? 'green' : record.risk_level === 'medium' ? 'orange' : 'red';
          return (
            <div>
              <Tag color={riskColor}>{record.current_workload_hours}h</Tag>
              {!record.can_take_more_work && <Tag color="red">Quá tải</Tag>}
            </div>
          );
        }
      },
      {
        title: 'Đánh giá',
        dataIndex: 'workload_assessment',
        key: 'workload_assessment',
        width: "40%",
        ellipsis: true,
        render: (text:any) => ( 
          <Tooltip placement="topLeft" title={text}>
            {text}
          </Tooltip>
        )
      },
      {
        title: 'Khớp/Tổng',
        key: 'match_count',
        render: (record: CandidateMatch) => (
          <span>
            {record.skill_match_count}/{record.total_required_skills}
          </span>
        )
      },
      {
        title: '',
        key: 'action',
        render: (record: CandidateMatch) => (
          <Button
            type={selectedCandidate === record.user_id ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedCandidate(record.user_id)}
          >
            {selectedCandidate === record.user_id ? <CheckCircleOutlined /> : 'Chọn'}
          </Button>
        )
      }
    ];

    // Find selected candidate from both lists
    const selectedCandidateData = 
      suggestedCandidates.find((c: CandidateMatch) => c.user_id === selectedCandidate) || 
      allProjectMembers.find((c: CandidateMatch) => c.user_id === selectedCandidate);

    return (
      <div>
        {/* SECTION 1: Suggested Candidates (with matching skills) */}
        <Card 
          title={
            <Space>
              <StarOutlined style={{ color: '#faad14' }} />
              <span>Người được đề xuất (có kỹ năng phù hợp)</span>
            </Space>
          }
          extra={<Tag color="gold">{suggestedCandidates.length} người</Tag>}
          style={{ marginBottom: 16 }}
        >
          {suggestedCandidates.length > 0 ? (
            <>
              <Alert
                message="Những người này có ít nhất 1 kỹ năng đáp ứng yêu cầu của công việc"
                type="success"
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 12 }}
              />
              <Table
                dataSource={suggestedCandidates}
                columns={candidateColumns}
                rowKey={(record) => record.user_id}
                pagination={false}
                scroll={{ y: 300 }}
                size="small"
              />
            </>
          ) : (
            <Alert
              message="Không có người nào đáp ứng yêu cầu kỹ năng"
              description="Vui lòng chọn từ danh sách thành viên dự án bên dưới hoặc điều chỉnh yêu cầu kỹ năng"
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* SECTION 2: All Project Members */}
        <Card 
          title={
            <Space>
              <UserOutlined style={{ color: '#1890ff' }} />
              <span>Tất cả thành viên trong dự án</span>
            </Space>
          }
          extra={<Tag color="blue">{allProjectMembers.length} người</Tag>}
        >
          <Alert
            message="Danh sách đầy đủ tất cả thành viên trong dự án, bạn có thể chọn bất kỳ ai"
            type="info"
            icon={<UserOutlined />}
            style={{ marginBottom: 12 }}
          />
          <Table
            dataSource={allProjectMembers}
            columns={candidateColumns}
            rowKey={(record) => record.user_id}
            pagination={false}
            scroll={{ y: 300 }}
            size="small"
          />
        </Card>

        {/* Selected Candidate Details */}
        {selectedCandidateData && (
          <Card title="Chi tiết người được chọn" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>Tên:</strong> {selectedCandidateData.fullName || `User ${selectedCandidateData.user_id}`}
              </div>
              
              {selectedCandidateData.workload_assessment && (
                <Alert
                  message="Đánh giá Workload"
                  description={selectedCandidateData.workload_assessment}
                  type={selectedCandidateData.can_take_more_work ? 'success' : 'warning'}
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              )}
              
              {selectedCandidateData.matched_skills && selectedCandidateData.matched_skills.length > 0 && (
                <div>
                  <strong>Kỹ năng khớp:</strong>
                  <div style={{ marginTop: 8 }}>
                    {selectedCandidateData.matched_skills.map((skill: any, idx: number) => (
                      <Tag
                        key={idx}
                        color={skill.is_match ? 'green' : 'orange'}
                        style={{ marginBottom: 4 }}
                      >
                        {skill.skill_name}: Yêu cầu {skill.required_level} / Có {skill.user_level}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidateData.missing_skills && selectedCandidateData.missing_skills.length > 0 && (
                <div>
                  <strong>Kỹ năng thiếu:</strong>
                  <div style={{ marginTop: 8 }}>
                    {selectedCandidateData.missing_skills.map((skill: any, idx: number) => (
                      <Tag key={idx} color="red" style={{ marginBottom: 4 }}>
                        {skill.skill_name} (Level {skill.required_level})
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        )}

        <Divider />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(1)}>Quay lại</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleCreateTask}
            loading={loading}
            disabled={!selectedCandidate}
          >
            Tạo công việc
          </Button>
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title="Tạo công việc mới với AI"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Nhập thông tin" icon={<BulbOutlined />} />
        <Step title="Phân tích AI" icon={<RobotOutlined />} />
        <Step title="Chọn ứng viên" icon={<UserOutlined />} />
      </Steps>

      <Spin spinning={loading}>
        {currentStep === 0 && renderStepInput()}
        {currentStep === 1 && renderStepAnalysis()}
        {currentStep === 2 && renderStepCandidates()}
      </Spin>
    </Modal>
  );
};

export default TaskCreateWithAI;

import { useCallback, useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import DatePicker from '@cloudscape-design/components/date-picker';
import FileUpload from '@cloudscape-design/components/file-upload';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import Badge from '@cloudscape-design/components/badge';
import { api, ProjectFile } from '../../api/client';
import { useFlash } from '../../lib/flash';
import { dateStr, money, text } from '../../lib/format';
import { labelOf, useMeta } from '../../lib/meta';
import ReviewTag from '../../components/ReviewTag';
import OwnerTag, { OwnerDot } from '../../components/OwnerTag';
import { useActor } from '../../lib/actor';

function sizeStr(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesTab({ projectId }: { projectId: number }) {
  const meta = useMeta();
  const flash = useFlash();
  const { actor } = useActor();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploadedBy, setUploadedBy] = useState<string>('');
  const [who, setWho] = useState<string>('');
  const [picked, setPicked] = useState<File[]>([]);
  const [docType, setDocType] = useState('other');
  const [docDate, setDocDate] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<ProjectFile | null>(null);
  const [draft, setDraft] = useState<any>({});

  const load = useCallback(() => api.files(projectId).then(setFiles), [projectId]);
  useEffect(() => { load(); }, [load]);

  const typeOptions = meta?.file_types.map((t) => ({ label: `${t.label}（${t.stage}）`, value: t.value })) ?? [];
  const peopleOptions = (meta?.people ?? []).map((p) => ({ label: p.label, value: p.code, description: p.role || undefined }));
  // 上传人默认值：谁登录就是谁；负责人代传时按文件类型给默认
  const defaultUploader = actor !== '负责人' ? actor : (meta?.file_default_owner?.[docType] ?? '负责人');
  const uploader = uploadedBy || defaultUploader;
  const uploaders = Array.from(new Set(files.map((f) => f.uploaded_by).filter(Boolean))) as string[];
  const shown = who ? files.filter((f) => f.uploaded_by === who) : files;

  const upload = async () => {
    if (!picked[0]) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', picked[0]);
      form.append('doc_type', docType);
      if (docDate) form.append('doc_date', docDate);
      if (counterparty) form.append('counterparty', counterparty);
      if (amount) form.append('amount', amount);
      form.append('uploaded_by', uploader);
      await api.upload(projectId, form);
      setPicked([]); setDocDate(''); setCounterparty(''); setAmount(''); setUploadedBy('');
      await load();
      flash({ type: 'success', content: '文件已上传并登记' });
    } catch (e: any) {
      flash({ type: 'error', content: `上传失败：${e.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h2" description="文件不只是存起来，而是登记：类型、阶段、日期、对方、金额。以后 AI 会自动填这些字段。"><ReviewTag id="A" /><OwnerTag block="files.upload" />上传并登记文件</Header>}>
        <SpaceBetween size="m">
          <FileUpload
            value={picked}
            onChange={({ detail }) => setPicked(detail.value)}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.xml,.jpg,.jpeg,.png,.txt"
            showFileSize
            i18nStrings={{
              uploadButtonText: () => '选择文件',
              dropzoneText: () => '拖拽文件到这里',
              removeFileAriaLabel: (i) => `移除第 ${i + 1} 个文件`,
              limitShowFewer: '收起',
              limitShowMore: '更多',
              errorIconAriaLabel: '错误',
            }}
            constraintText="支持 PDF、Word、Excel、XML、图片"
          />
          <ColumnLayout columns={4}>
            <FormField label="文件类型">
              <Select selectedOption={typeOptions.find((o) => o.value === docType) ?? null} options={typeOptions} onChange={({ detail }) => setDocType(detail.selectedOption.value!)} />
            </FormField>
            <FormField label="上传人（谁传的）" description={actor === '负责人' ? '按文件类型给了默认值，可改' : '就是你'}>
              <Select selectedOption={peopleOptions.find((o) => o.value === uploader) ?? { label: uploader, value: uploader }} options={peopleOptions} onChange={({ detail }) => setUploadedBy(detail.selectedOption.value!)} />
            </FormField>
            <FormField label="文件日期">
              <DatePicker value={docDate} onChange={({ detail }) => setDocDate(detail.value)} placeholder="YYYY/MM/DD" />
            </FormField>
            <FormField label="对方（承包商 / 卖方 / 机构）">
              <Input value={counterparty} onChange={({ detail }) => setCounterparty(detail.value)} />
            </FormField>
            <FormField label="涉及金额（美元）">
              <Input type="number" value={amount} onChange={({ detail }) => setAmount(detail.value)} />
            </FormField>
          </ColumnLayout>
          <Box><Button variant="primary" loading={uploading} disabled={!picked[0]} onClick={upload}>上传并登记</Button></Box>
        </SpaceBetween>
      </Container>

      <Table
        header={
          <Header
            variant="h2"
            counter={`(${shown.length}${who ? ` / ${files.length}` : ''})`}
            description="文件都放在一起，按“谁传的”可以筛。"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant={who ? 'normal' : 'primary'} onClick={() => setWho('')}>全部</Button>
                {uploaders.map((u) => <Button key={u} variant={who === u ? 'primary' : 'normal'} onClick={() => setWho(who === u ? '' : u)}>{u}</Button>)}
              </SpaceBetween>
            }
          >
            <ReviewTag id="B" /><OwnerTag block="files.table" />文件登记表
          </Header>
        }
        items={shown}
        empty={<Box textAlign="center" color="inherit"><b>还没有文件</b></Box>}
        columnDefinitions={[
          { id: 'name', header: '文件名', cell: (f) => <Link href={`/api/files/${f.id}/download`} external>{f.filename}</Link> },
          { id: 'who', header: '谁传的', cell: (f) => (f.uploaded_by ? <OwnerDot code={f.uploaded_by} /> : '—') },
          { id: 'type', header: '类型', cell: (f) => labelOf(meta?.file_types, f.doc_type) },
          { id: 'stage', header: '阶段', cell: (f) => text(f.stage) },
          { id: 'date', header: '文件日期', cell: (f) => dateStr(f.doc_date) },
          { id: 'cp', header: '对方', cell: (f) => text(f.counterparty) },
          { id: 'amt', header: '金额', cell: (f) => money(f.amount) },
          { id: 'src', header: '来源', cell: (f) => <Badge color={f.source === 'lark' ? 'grey' : 'blue'}>{f.source === 'lark' ? 'Lark 迁入' : '上传'}</Badge> },
          { id: 'size', header: '大小', cell: (f) => sizeStr(f.size) },
          { id: 'act', header: '操作', cell: (f) => (
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="inline-link" onClick={() => { setEditing(f); setDraft({ doc_type: f.doc_type ?? 'other', doc_date: f.doc_date ?? '', counterparty: f.counterparty ?? '', amount: f.amount == null ? '' : String(f.amount), uploaded_by: f.uploaded_by ?? '' }); }}>编辑</Button>
              <Button variant="inline-link" onClick={async () => { await api.deleteFile(f.id); await load(); flash({ type: 'success', content: '文件已删除' }); }}>删除</Button>
            </SpaceBetween>
          ) },
        ]}
      />

      <Modal
        visible={!!editing}
        onDismiss={() => setEditing(null)}
        header={`编辑登记信息：${editing?.filename ?? ''}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setEditing(null)}>取消</Button>
              <Button variant="primary" onClick={async () => {
                if (!editing) return;
                await api.patchFile(editing.id, { doc_type: draft.doc_type, doc_date: draft.doc_date || null, counterparty: draft.counterparty || null, amount: draft.amount === '' ? null : Number(draft.amount), uploaded_by: draft.uploaded_by || null });
                setEditing(null); await load(); flash({ type: 'success', content: '登记信息已更新' });
              }}>保存</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="文件类型">
            <Select selectedOption={typeOptions.find((o) => o.value === draft.doc_type) ?? null} options={typeOptions} onChange={({ detail }) => setDraft((d: any) => ({ ...d, doc_type: detail.selectedOption.value }))} />
          </FormField>
          <FormField label="上传人（谁传的）">
            <Select selectedOption={peopleOptions.find((o) => o.value === draft.uploaded_by) ?? null} options={peopleOptions} onChange={({ detail }) => setDraft((d: any) => ({ ...d, uploaded_by: detail.selectedOption.value }))} />
          </FormField>
          <FormField label="文件日期"><DatePicker value={draft.doc_date ?? ''} onChange={({ detail }) => setDraft((d: any) => ({ ...d, doc_date: detail.value }))} placeholder="YYYY/MM/DD" /></FormField>
          <FormField label="对方"><Input value={draft.counterparty ?? ''} onChange={({ detail }) => setDraft((d: any) => ({ ...d, counterparty: detail.value }))} /></FormField>
          <FormField label="涉及金额（美元）"><Input type="number" value={draft.amount ?? ''} onChange={({ detail }) => setDraft((d: any) => ({ ...d, amount: detail.value }))} /></FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

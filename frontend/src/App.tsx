import { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import Autosuggest from '@cloudscape-design/components/autosuggest';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import Dashboard from './pages/Dashboard';
import MyTodo from './pages/MyTodo';
import AddProject from './pages/AddProject';
import ProjectPage from './pages/project/ProjectPage';
import AssistantPanel from './components/AssistantPanel';
import { api, AddressCandidate } from './api/client';
import { FlashContext } from './lib/flash';
import { ReviewContext } from './components/ReviewTag';
import { ActorContext, getActor, setActor as persistActor } from './lib/actor';
import { useMeta } from './lib/meta';
import { TIER_FALLBACK, Tier } from './lib/role';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(true);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [flashes, setFlashes] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [q, setQ] = useState('');
  const [cands, setCands] = useState<AddressCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const meta = useMeta();
  const [actor, setActorState] = useState<string>(getActor);
  const setActor = (c: string) => { persistActor(c); setActorState(c); };
  const [reviewOn, setReviewOn] = useState<boolean>(() => { try { return localStorage.getItem('reviewTags') !== 'off'; } catch { return true; } });
  const toggleReview = () => { const v = !reviewOn; setReviewOn(v); try { localStorage.setItem('reviewTags', v ? 'on' : 'off'); } catch { /* ignore */ } };

  const pushFlash = (msg: Omit<FlashbarProps.MessageDefinition, 'id' | 'onDismiss' | 'dismissible'>) => {
    const id = String(Date.now());
    setFlashes((prev) => [...prev, { ...msg, id, dismissible: true, onDismiss: () => setFlashes((p) => p.filter((f) => f.id !== id)) }]);
    setTimeout(() => setFlashes((p) => p.filter((f) => f.id !== id)), 6000);
  };

  const roleOf = (code: string) => meta?.roles.find((r) => r.code === code);
  const tier: Tier = (roleOf(actor)?.tier as Tier) ?? 'blue';
  const tierInfo = meta?.tiers?.[tier] ?? TIER_FALLBACK[tier];
  const canDo = (action: string) => { const ok = meta?.permissions?.[action] ?? ['purple', 'blue']; return ok.includes(tier) || ok.includes(actor); };
  const tierOrder: Tier[] = ['purple', 'blue', 'teal', 'grey'];
  const roleGroups = tierOrder.map((t) => ({
    id: `g-${t}`, text: `${(meta?.tiers?.[t] ?? TIER_FALLBACK[t]).label}（${{ purple: '紫', blue: '蓝', teal: '青', grey: '灰' }[t]}）`,
    items: (meta?.roles ?? []).filter((r) => r.tier === t).map((r) => ({ id: r.code, text: r.label, description: r.duties || undefined })),
  })).filter((g) => g.items.length);
  const activeHref = location.pathname === '/projects/new' ? '/projects/new' : location.pathname.startsWith('/projects') ? '/projects' : '/';

  return (
    <FlashContext.Provider value={pushFlash}>
    <ReviewContext.Provider value={reviewOn}>
    <ActorContext.Provider value={{ actor, setActor }}>
      <div id="top-nav" style={{ position: 'sticky', top: 0, zIndex: 1002, borderBottom: `3px solid ${tierInfo.color}` }}>
        <TopNavigation
          identity={{ href: '/', title: '翻新项目平台', onFollow: (e) => { e.preventDefault(); navigate('/'); } }}
          search={
            <Autosuggest
              value={q}
              placeholder="输入地址，开始一套新房子"
              ariaLabel="按地址新建项目"
              options={cands.map((c) => ({ value: c.label, label: c.label, description: `${c.city}, ${c.state} ${c.zip}` }))}
              filteringType="manual"
              statusType={searching ? 'loading' : 'finished'}
              loadingText="查找中"
              empty="没有找到地址"
              enteredTextLabel={(v) => `用“${v}”新建`}
              onChange={({ detail }) => setQ(detail.value)}
              onLoadItems={async ({ detail }) => {
                if (detail.filteringText.length < 2) { setCands([]); return; }
                setSearching(true);
                try { setCands(await api.lookupAddress(detail.filteringText)); } finally { setSearching(false); }
              }}
              onSelect={({ detail }) => {
                const v = detail.selectedOption?.value ?? detail.value;
                setQ('');
                navigate(`/projects/new?address=${encodeURIComponent(v)}`);
              }}
            />
          }
          utilities={[
            ...(canDo('create_project') ? [{ type: 'button' as const, text: '新建项目', iconName: 'add-plus' as const, onClick: () => navigate('/projects/new') }] : []),
            { type: 'button', text: `评审标注：${reviewOn ? '开' : '关'}`, iconName: reviewOn ? 'status-positive' : 'status-stopped', onClick: toggleReview },
            {
              type: 'menu-dropdown', text: `我是：${actor} · ${tierInfo.label}`, iconName: 'user-profile', title: `切换身份：谁在填，就选谁。当前级别：${tierInfo.label}`,
              items: roleGroups.length ? roleGroups : [{ id: '负责人', text: '负责人' }],
              onItemClick: ({ detail }) => setActor(detail.id),
            },
          ]}
        />
      </div>
      <AppLayout
        headerSelector="#top-nav"
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        notifications={<Flashbar items={flashes} />}
        toolsHide
        drawers={[
          {
            id: 'assistant',
            trigger: { iconName: 'gen-ai' },
            ariaLabels: { drawerName: '助手', closeButton: '关闭助手', triggerButton: '打开助手' },
            resizable: true,
            defaultSize: 400,
            content: <AssistantPanel />,
          },
        ]}
        activeDrawerId={drawer}
        onDrawerChange={({ detail }) => setDrawer(detail.activeDrawerId)}
        navigation={
          <SideNavigation
            header={{ href: '/', text: '翻新项目平台' }}
            activeHref={activeHref}
            onFollow={(e) => { if (!e.detail.external) { e.preventDefault(); navigate(e.detail.href); } }}
            items={[
              { type: 'link', text: canDo('dashboard') ? '工作台' : '我的待办', href: '/' },
              ...(canDo('dashboard') ? [{ type: 'link' as const, text: '项目', href: '/projects' }] : []),
              ...(canDo('create_project') ? [{ type: 'link' as const, text: '新建项目', href: '/projects/new' }] : []),
              { type: 'divider' },
              { type: 'link', text: '接口文档', href: 'http://127.0.0.1:8000/docs', external: true },
            ]}
          />
        }
        content={
          <Routes>
            <Route path="/" element={canDo('dashboard') ? <Dashboard /> : <MyTodo />} />
            <Route path="/projects" element={canDo('dashboard') ? <Dashboard listOnly /> : <MyTodo />} />
            <Route path="/projects/new" element={<AddProject />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="*" element={canDo('dashboard') ? <Dashboard /> : <MyTodo />} />
          </Routes>
        }
      />
    </ActorContext.Provider>
    </ReviewContext.Provider>
    </FlashContext.Provider>
  );
}

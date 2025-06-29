import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  Detail,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface MountPoint {
  id: string;
  name: string;
  localPath: string;
  remotePath: string;
  user: string;
  host: string;
  createdAt: string;
}

interface ActiveMount {
  device: string;
  mountPoint: string;
  type: string;
}

const STORAGE_KEY = "sshfs-mount-points";

async function mountSSHFS(mountPoint: MountPoint): Promise<void> {
  const { user, host, remotePath, localPath } = mountPoint;
  const expandedLocalPath = localPath.replace("~", process.env.HOME || "");

  try {
    await execAsync(`mkdir -p "${expandedLocalPath}"`);

    const sshfsCommand = `sshfs -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 ${user}@${host}:${remotePath} "${expandedLocalPath}"`;
    await execAsync(sshfsCommand);

    await showToast({
      style: Toast.Style.Success,
      title: "마운트 성공",
      message: `${mountPoint.name}이 ${expandedLocalPath}에 마운트됨`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "마운트 실패",
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    throw error;
  }
}

async function unmountPath(mountPath: string, force = false): Promise<void> {
  try {
    let command = `umount "${mountPath}"`;
    if (force) {
      command = `diskutil unmount force "${mountPath}"`;
    }

    await execAsync(command);

    await showToast({
      style: Toast.Style.Success,
      title: "언마운트 성공",
      message: `${mountPath} 언마운트됨`,
    });
  } catch (error) {
    if (!force) {
      const confirmed = await confirmAlert({
        title: "강제 언마운트",
        message: "일반 언마운트가 실패했습니다. 강제로 언마운트하시겠습니까?",
        primaryAction: {
          title: "강제 언마운트",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        return unmountPath(mountPath, true);
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "언마운트 실패",
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    throw error;
  }
}

export default function Command() {
  const [mountPoints, setMountPoints] = useState<MountPoint[]>([]);
  const [activeMounts, setActiveMounts] = useState<ActiveMount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMountPoints();
    loadActiveMounts();
  }, []);

  const loadMountPoints = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        setMountPoints(JSON.parse(stored));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "마운트 포인트 로드 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveMounts = async () => {
    try {
      const { stdout } = await execAsync("mount | grep fuse");
      const mounts = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(" ");
          return {
            device: parts[0],
            mountPoint: parts[2],
            type: parts[4],
          };
        });
      setActiveMounts(mounts);
    } catch {
      setActiveMounts([]);
    }
  };

  const saveMountPoints = async (points: MountPoint[]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(points));
      setMountPoints(points);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "마운트 포인트 저장 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="SSHFS 기능 검색...">
      <List.Section title="마운트 관리">
        <List.Item
          title="새 마운트 포인트 생성"
          subtitle="새로운 SSH 마운트 포인트를 추가합니다"
          icon="📁"
          actions={
            <ActionPanel>
              <Action.Push
                title="마운트 포인트 생성"
                target={<CreateMountPoint onSave={saveMountPoints} mountPoints={mountPoints} />}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="마운트 포인트 목록"
          subtitle={`저장된 마운트 포인트: ${mountPoints.length}개`}
          icon="📋"
          actions={
            <ActionPanel>
              <Action.Push
                title="마운트 포인트 보기"
                target={
                  <MountPointList mountPoints={mountPoints} onSave={saveMountPoints} onRefresh={loadActiveMounts} />
                }
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="활성 마운트 해제"
          subtitle={`현재 마운트된 항목: ${activeMounts.length}개`}
          icon="⏏️"
          actions={
            <ActionPanel>
              <Action.Push
                title="마운트 해제"
                target={<ActiveMountList activeMounts={activeMounts} onRefresh={loadActiveMounts} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="시스템 정보">
        <List.Item
          title="SSHFS 설치 가이드"
          subtitle="macFUSE 및 sshfs-mac 설치 방법"
          icon="ℹ️"
          actions={
            <ActionPanel>
              <Action.Push title="설치 가이드 보기" target={<InstallationGuide />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CreateMountPoint({
  onSave,
  mountPoints,
}: {
  onSave: (points: MountPoint[]) => void;
  mountPoints: MountPoint[];
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    name: string;
    localPath: string;
    user: string;
    host: string;
    remotePath: string;
  }) => {
    const newMountPoint: MountPoint = {
      id: Date.now().toString(),
      name: values.name,
      localPath: values.localPath,
      remotePath: values.remotePath,
      user: values.user,
      host: values.host,
      createdAt: new Date().toISOString(),
    };

    const updatedPoints = [...mountPoints, newMountPoint];
    await onSave(updatedPoints);

    await showToast({
      style: Toast.Style.Success,
      title: "마운트 포인트 생성 완료",
      message: `${values.name} 생성됨`,
    });

    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="생성" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="이름" placeholder="예: 개발 서버" />
      <Form.TextField id="localPath" title="로컬 경로" placeholder="예: ~/remote-server" />
      <Form.TextField id="user" title="사용자명" placeholder="예: ubuntu" />
      <Form.TextField id="host" title="호스트" placeholder="예: 192.168.1.100" />
      <Form.TextField id="remotePath" title="원격 경로" placeholder="예: /home/ubuntu" />
    </Form>
  );
}

function MountPointList({
  mountPoints,
  onSave,
  onRefresh,
}: {
  mountPoints: MountPoint[];
  onSave: (points: MountPoint[]) => void;
  onRefresh: () => void;
}) {
  const handleMount = async (mountPoint: MountPoint) => {
    try {
      await mountSSHFS(mountPoint);
      await onRefresh();
    } catch {
      // 에러는 mountSSHFS 함수에서 처리됨
    }
  };

  const handleDelete = async (mountPoint: MountPoint) => {
    const confirmed = await confirmAlert({
      title: "마운트 포인트 삭제",
      message: `"${mountPoint.name}"을 삭제하시겠습니까?`,
      primaryAction: {
        title: "삭제",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedPoints = mountPoints.filter((p) => p.id !== mountPoint.id);
      await onSave(updatedPoints);

      await showToast({
        style: Toast.Style.Success,
        title: "마운트 포인트 삭제됨",
        message: `${mountPoint.name} 삭제됨`,
      });
    }
  };

  return (
    <List searchBarPlaceholder="마운트 포인트 검색...">
      {mountPoints.length === 0 ? (
        <List.EmptyView title="저장된 마운트 포인트가 없습니다" description="새 마운트 포인트를 생성해보세요" />
      ) : (
        mountPoints.map((mountPoint) => (
          <List.Item
            key={mountPoint.id}
            title={mountPoint.name}
            subtitle={`${mountPoint.user}@${mountPoint.host}:${mountPoint.remotePath} → ${mountPoint.localPath}`}
            icon="🖥️"
            accessories={[{ text: new Date(mountPoint.createdAt).toLocaleDateString() }]}
            actions={
              <ActionPanel>
                <Action title="마운트" icon="🔗" onAction={() => handleMount(mountPoint)} />
                <Action
                  title="삭제"
                  icon="🗑️"
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(mountPoint)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ActiveMountList({ activeMounts, onRefresh }: { activeMounts: ActiveMount[]; onRefresh: () => void }) {
  const handleUnmount = async (mount: ActiveMount) => {
    try {
      await unmountPath(mount.mountPoint);
      await onRefresh();
    } catch {
      // 에러는 unmountPath 함수에서 처리됨
    }
  };

  return (
    <List searchBarPlaceholder="활성 마운트 검색...">
      {activeMounts.length === 0 ? (
        <List.EmptyView title="활성 마운트가 없습니다" description="현재 마운트된 SSHFS가 없습니다" />
      ) : (
        activeMounts.map((mount, index) => (
          <List.Item
            key={index}
            title={mount.device}
            subtitle={`마운트 위치: ${mount.mountPoint}`}
            icon="⚡"
            accessories={[{ text: mount.type }]}
            actions={
              <ActionPanel>
                <Action
                  title="언마운트"
                  icon="⏏️"
                  style={Action.Style.Destructive}
                  onAction={() => handleUnmount(mount)}
                />
                <Action title="새로고침" icon="🔄" onAction={onRefresh} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function InstallationGuide() {
  const markdown = `# SSHFS-Mac Installation Guide

## Prerequisites
- **macFUSE**: FUSE (Filesystem in Userspace) support for macOS
- **sshfs-mac**: SSH filesystem mounting tool

## Installation Process

### 1. Installation via Homebrew
\`\`\`bash
# Install macFUSE
brew install --cask macfuse

# Install sshfs-mac
brew install gromgit/fuse/sshfs-mac
\`\`\`

### 2. System Permission Configuration
1. Navigate to **System Settings** > **Privacy & Security**
2. In the **Security** section, approve macFUSE kernel extension
3. System restart may be required`;

  return <Detail markdown={markdown} />;
}

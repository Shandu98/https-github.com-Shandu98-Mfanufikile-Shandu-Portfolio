
export interface CameraDevice {
  deviceId: string;
  label: string;
}

export enum CameraSlot {
  ONE = 'ONE',
  TWO = 'TWO'
}

export interface StreamState {
  stream: MediaStream | null;
  error: string | null;
  loading: boolean;
}

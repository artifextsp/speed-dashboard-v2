import { VideoEditor } from "../fields/VideoEditor";

export function VideosTab({ videos, onChangeVideos }) {
  return <VideoEditor videos={videos} onChange={onChangeVideos} />;
}

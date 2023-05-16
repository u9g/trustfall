export interface AlgoliaSearchResult {
  created_at: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  story_text?: string;
  //   comment_text: any;
  num_comments: number;
  //   story_id: any;
  //   story_title: any;
  //   story_url: any;
  //   parent_id: any;
  created_at_i: number;
  //   _tags: string[];
  objectID: string;
  //   _highlightResult: HighlightResult;
}

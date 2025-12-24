export const KUAISHOU_GRAPHQL = {
  search_query: `
fragment photoContent on PhotoEntity {
  id
  duration
  caption
  likeCount
  viewCount
  commentCount
  coverUrl
  photoUrl
  timestamp
}

fragment feedContent on Feed {
  type
  author {
    id
    name
    headerUrl
  }
  photo {
    ...photoContent
  }
}

query visionSearchPhoto($keyword: String, $pcursor: String, $searchSessionId: String, $page: String) {
  visionSearchPhoto(keyword: $keyword, pcursor: $pcursor, searchSessionId: $searchSessionId, page: $page) {
    result
    feeds {
      ...feedContent
    }
    searchSessionId
    pcursor
  }
}`,

  video_detail: `
query visionVideoDetail($photoId: String, $page: String) {
  visionVideoDetail(photoId: $photoId, page: $page) {
    status
    author {
      id
      name
      headerUrl
    }
    photo {
      id
      duration
      caption
      likeCount
      coverUrl
      photoUrl
      timestamp
      viewCount
    }
  }
}`,

  comment_list: `
query commentListQuery($photoId: String, $pcursor: String) {
  visionCommentList(photoId: $photoId, pcursor: $pcursor) {
    commentCount
    pcursor
    rootComments {
      commentId
      authorId
      authorName
      content
      timestamp
      likedCount
      subCommentCount
    }
  }
}`,

  vision_profile: `
query visionProfile($userId: String) {
  visionProfile(userId: $userId) {
    userProfile {
      ownerCount {
        fan
        follow
        photo
      }
      profile {
        user_name
        user_id
        headurl
        user_text
      }
    }
  }
}`,
}

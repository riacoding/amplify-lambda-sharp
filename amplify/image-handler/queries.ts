export const createImage = /* GraphQL */ `
  mutation CreateImage($input: CreateImageInput!) {
    createImage(input: $input) {
      id
      title
      url
      productID
      createdAt
      updatedAt
      owner
    }
  }
`

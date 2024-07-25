'use client'
import { useEffect, useState } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import { StorageImage } from '@aws-amplify/ui-react-storage'
import { StorageManager } from '@aws-amplify/ui-react-storage'
import { generateClient } from 'aws-amplify/data'
import { type Schema } from '@/data/resource'

const client = generateClient<Schema>()
type Image = Schema['Image']['type']

type Props = {}

export default function ImageList({}: Props) {
  const [images, setImages] = useState<Image[]>([])

  useEffect(() => {
    const sub = client.models.Image.observeQuery().subscribe({
      next: ({ items, isSynced }) => {
        setImages([...items])
      },
    })
    return () => sub.unsubscribe()
  }, [])

  return (
    <div>
      <StorageManager acceptedFileTypes={['image/*']} path='public/' maxFileCount={1} isResumable />
      <div className='pt-10 grid grid-cols-2 gap-5'>
        {images.length > 0 &&
          images.map((image) => (
            <StorageImage
              style={{ objectFit: 'contain' }}
              key={image.id}
              alt='list-image'
              width={200}
              height={200}
              path={image.key}
              fallbackSrc='/placeholder.svg'
            />
          ))}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import { StorageImage } from '@aws-amplify/ui-react-storage'
import { StorageManager } from '@aws-amplify/ui-react-storage'
import { generateClient } from 'aws-amplify/data'
import { type Schema } from '@/data/resource'
import { TiDelete } from 'react-icons/ti'

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

  async function handleDelete(id: string) {
    console.log('deleting image: ', id)
    try {
      const { data: deleteImage, errors } = await client.models.Image.delete({ id })
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className='w-full md:w-1/3'>
      <StorageManager acceptedFileTypes={['image/*']} path='public/' maxFileCount={1} isResumable />
      <div className='pt-10 grid md:grid-cols-2 gap-5'>
        {images.length > 0 &&
          images.map((image) => (
            <div className='flex flex-col justify-center items-center p-2 md:p-5 bg-slate-50' key={image.id}>
              <TiDelete onClick={() => handleDelete(image.id)} className='text-2xl text-red-500 hover:cursor-pointer' />
              <StorageImage
                style={{ objectFit: 'contain' }}
                alt='list-image'
                width={200}
                height={200}
                path={image.key}
                fallbackSrc='/placeholder.svg'
              />
            </div>
          ))}
      </div>
    </div>
  )
}

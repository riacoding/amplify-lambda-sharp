import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className='w-full flex min-h-screen flex-col items-center p-10'>
      <h1 className='text-1xl md:text-4xl font-bold'>Amplify-Lambda-Sharp</h1>
      <ul className='p-5 list-disc'>
        <li>Amplify Gen 2</li>
        <li>Nextjs 14 App Router</li>
        <li>Lambda with Sharp in a seperate stack bundled with docker. *Will need docker installed locally</li>
        <li>DynamoDB Stream to Lambda for Image removal from bucket</li>
      </ul>
      <Link href='/upload'>
        <div className='p-5 text-2xl text-white font-semibold rounded-md bg-cyan-500 hover:bg-cyan-400'>See Upload</div>
      </Link>
    </main>
  )
}

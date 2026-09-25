import cloudinary
import cloudinary.uploader
import os
from typing import Optional


def init_cloudinary():
    """
    Initialize Cloudinary with credentials from environment variables.
    Must be called before using upload functions.
    """
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )


async def upload_profile_picture(file_content: bytes, user_id: int) -> tuple[Optional[str], Optional[str]]:
    """
    Upload a profile picture to Cloudinary.

    Uploads to a temporary public_id first and only promotes it to the user's
    real (stable) public_id after moderation passes. This ensures a rejected
    or failed upload never destroys the user's existing accepted picture —
    uploading straight to the stable public_id with overwrite=True would
    replace the old image before moderation even ran.

    Args:
        file_content: The image file content as bytes
        user_id: The user's ID (used for unique filename)

    Returns:
        The URL of the uploaded image, or None if upload fails
    """
    stable_public_id = f"user_{user_id}"
    temp_public_id = f"user_{user_id}_pending"
    try:
        # Upload with transformations:
        # - resize to 800x800 for better quality
        # - crop to face if detected, otherwise center
        # - use high quality settings
        result = cloudinary.uploader.upload(
            file_content,
            folder="matchmyroom/profiles",
            public_id=temp_public_id,
            overwrite=True,
            moderation="aws_rek",
            transformation=[
                {"width": 800, "height": 800, "crop": "fill", "gravity": "face"},
                {"quality": "auto:best"},
                {"fetch_format": "auto"}
            ]
        )

        # Reject if AWS Rekognition flagged the image as inappropriate.
        # The old, accepted picture at stable_public_id is untouched.
        if result.get("moderation") and result["moderation"][0].get("status") == "rejected":
            cloudinary.uploader.destroy(f"matchmyroom/profiles/{temp_public_id}")
            return None, "rejected"

        # Promote the accepted upload to the user's stable public_id,
        # atomically replacing whatever picture was there before.
        renamed = cloudinary.uploader.rename(
            f"matchmyroom/profiles/{temp_public_id}",
            f"matchmyroom/profiles/{stable_public_id}",
            overwrite=True,
        )
        return renamed.get("secure_url"), None

    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        try:
            cloudinary.uploader.destroy(f"matchmyroom/profiles/{temp_public_id}")
        except Exception:
            pass
        return None, None


def delete_profile_picture(user_id: int) -> bool:
    """
    Delete a user's profile picture from Cloudinary.

    Args:
        user_id: The user's ID

    Returns:
        True if deletion was successful, False otherwise
    """
    try:
        result = cloudinary.uploader.destroy(f"matchmyroom/profiles/user_{user_id}")
        return result.get("result") == "ok"
    except Exception as e:
        print(f"Error deleting from Cloudinary: {e}")
        return False

# -*- encoding: utf-8 -*-
"""
批量下载三节课课程
"""
import os
import sys

jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMDAwMDAwMSIsImp0aSI6IjM4ODEyMGMzNmZhODBjMzIyYmNhNzQxMWViODIyNjJjZDcwMzExYjMzZGZhMmViOTkxMDRhNmFjNWQ4YWU1MDllYWE4MzQwNmVkNjdlNzNkIiwiaWF0IjoxNzc5MTY5MDYwLCJuYmYiOjE3NzkxNjkwNjAsImV4cCI6MTc4MDQ2NTA2MCwic3ViIjoiMjMxMzE1NTIiLCJpc3MiOiJzYW5qaWVrZS1vbmxpbmUiLCJzaWQiOiIzODgxMjBjMzZmYTgwYzMyMmJjYTc0MTFlYjgyMjYyY2Q3MDMxMWIzM2RmYTJlYjk5MTA0YTZhYzVkOGFlNTA5ZWFhODM0MDZlZDY3ZTczZCIsInNjb3BlcyI6W119.awnchPXEASUeSXiQ_tKG3PT9zjFvRn1vf4drA0c8RJp4JFljedCD1_thjRpKhZSViZOaXSTN7Nz6MrTbcavYqQ"

courses = [
    ("32792694", "32792426"),
    ("34007172", "36183082"),
    ("34009267", "36752224"),
    ("34002546", "34568443"),
    ("34003715", "34805709"),
    ("34009738", "37409158"),
    ("34007621", "36304606"),
    ("34010204", "37488691"),
    ("34009735", "37408035"),
]

output_dir = r"d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian"

cmd = f'python "{output_dir}\\.trae\\skills\\sanjieke-downloader\\scripts\\sjk_downloader.py" --jwt "{jwt}" --course {{course}} --class {{class_id}} --output "{output_dir}"'

for i, (course_id, class_id) in enumerate(courses, 1):
    print(f"\n{'='*60}")
    print(f"下载课程 {i}/9: {course_id}")
    print(f"{'='*60}")
    os.system(cmd.format(course=course_id, class_id=class_id))

print(f"\n{'='*60}")
print("全部下载完成！")
print(f"{'='*60}")
